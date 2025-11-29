import OpenAI from 'openai';
import tools from '../tools/tools.js';
import { AGENT_SYSTEM_PROMPT, ANALYSIS_PROMPT } from '../prompts.js';
import { client } from '../connect.js';
import { triggerRedTeamAnalysis } from './redteam.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Main agent job runner
 * Analyzes a model and generates trust insights
 */
export async function runAgentJob(slug, reason = 'scheduled') {
  console.log(`\n[Agent] Starting analysis job for: ${slug} (reason: ${reason})`);
  
  try {
    // Step 1: Gather data using tools
    console.log('[Agent] Step 1: Gathering data...');
    const [stats, ratingsResult, modelCardResult, benchmarkResult] = await Promise.all([
      tools.get_model_stats(slug),
      tools.get_chain_ratings(slug),
      tools.get_model_card(slug),
      tools.get_benchmark(slug)
    ]);
    
    if (!stats.success) {
      console.log(`[Agent] Failed to get stats for ${slug}: ${stats.error}`);
      return { success: false, error: 'Failed to get model stats' };
    }
    
    // Step 2: Run anomaly detection
    console.log('[Agent] Step 2: Running anomaly detection...');
    const anomaliesResult = await tools.detect_anomalies(
      slug,
      ratingsResult.ratings || [],
      stats
    );
    
    // Step 3: Compare claimed vs measured accuracy
    console.log('[Agent] Step 3: Comparing accuracy claims...');
    const accuracyComparison = await tools.compare_accuracy(
      slug,
      modelCardResult.modelCard,
      benchmarkResult.benchmark
    );
    
    // Step 4: Get historical data
    console.log('[Agent] Step 4: Fetching historical data...');
    const db = client.db('veriAI');
    const historicalResult = await tools.get_historical_trend(slug, db);
    
    // Step 5: Build context for LLM
    console.log('[Agent] Step 5: Building analysis context...');
    const context = {
      slug,
      stats,
      ratings: ratingsResult.ratings || [],
      modelCard: modelCardResult.modelCard,
      benchmark: benchmarkResult.benchmark,
      anomalies: anomaliesResult.anomalies || { flags: [], riskScore: 0 },
      accuracyComparison: accuracyComparison.comparison,
      historical: historicalResult.historical
    };
    
    // Step 6: Run Red-Team Security Tests
    console.log('[Agent] Step 6: Running red-team security tests...');
    const redTeamResult = await triggerRedTeamAnalysis(slug, {
      modelCard: modelCardResult.modelCard,
      chainRatings: ratingsResult.ratings || [],
      baselineTrustScore: stats.trustScore / 100,
      modelName: modelCardResult.modelCard?.modelId || slug
    });
    
    // Step 7: Call LLM for analysis (now includes red-team findings)
    console.log('[Agent] Step 7: Calling LLM for comprehensive analysis...');
    const insight = await analyzeTrust(context, redTeamResult);
    
    if (!insight) {
      console.error('[Agent] LLM analysis failed');
      return { success: false, error: 'LLM analysis failed' };
    }
    
    // Step 8: Save insight to database (with red-team results)
    console.log('[Agent] Step 8: Saving insight to database...');
    const insightData = {
      modelSlug: slug,
      ...insight,
      redTeam: redTeamResult, // Include full red-team analysis
      context: {
        totalRatings: stats.totalRatings,
        trustScore: stats.trustScore,
        anomalyCount: context.anomalies.flags.length,
        riskScore: context.anomalies.riskScore,
        securityTests: {
          testsRun: redTeamResult.metadata.testsRun,
          testsFailed: redTeamResult.metadata.testsFailed,
          riskLevel: redTeamResult.riskLevel
        }
      },
      createdAt: new Date()
    };
    
    const result = await db.collection('agent_insights').insertOne(insightData);
    const insightId = result.insertedId;
    
    // Step 9: Save red-team analysis separately for quick access
    await db.collection('redteam_analyses').insertOne({
      modelSlug: slug,
      ...redTeamResult,
      insightId
    });
    
    // Step 10: Save trust snapshot
    await db.collection('trust_snapshots').insertOne({
      modelSlug: slug,
      trustScore: stats.trustScore,
      stats,
      createdAt: new Date()
    });
    
    // Step 11: Notify frontend if high risk
    if (insight.risk_level === 'HIGH' || insight.risk_level === 'CRITICAL') {
      console.log('[Agent] High risk detected, notifying frontend...');
      await notifyFrontend(slug, insight);
    }
    
    console.log(`[Agent] ✓ Analysis complete for ${slug}`);
    console.log(`[Agent]   Risk Level: ${insight.risk_level}`);
    console.log(`[Agent]   Veracity: ${insight.veracity}`);
    console.log(`[Agent]   Confidence: ${(insight.confidence * 100).toFixed(1)}%`);
    
    return {
      success: true,
      insightId,
      insight,
      slug
    };
    
  } catch (error) {
    console.error(`[Agent] Job failed for ${slug}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Call OpenAI GPT-4 for trust analysis
 * Now includes red-team security test results
 */
async function analyzeTrust(context, redTeamResult = null) {
  try {
    let prompt = ANALYSIS_PROMPT(context);
    
    // Append red-team findings to the analysis prompt
    if (redTeamResult) {
      prompt += `\n\n## RED-TEAM SECURITY TESTS\n`;
      prompt += `Risk Level: ${redTeamResult.riskLevel}\n`;
      prompt += `Tests Run: ${redTeamResult.metadata.testsRun}\n`;
      prompt += `Tests Failed: ${redTeamResult.metadata.testsFailed}\n\n`;
      
      redTeamResult.tests.forEach(test => {
        prompt += `### ${test.name}: ${test.status}\n`;
        prompt += `${test.detail}\n`;
        if (test.evidence?.failures?.length > 0) {
          prompt += `Failures:\n`;
          test.evidence.failures.slice(0, 3).forEach(f => {
            prompt += `- ${f.detail || f.vulnerability || f.risk}\n`;
          });
        }
        prompt += `\n`;
      });
      
      prompt += `\nVerdict: ${redTeamResult.verdict.summary}\n`;
      prompt += `\nConsider these security findings in your trust analysis.`;
    }
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview', // Use gpt-4 or gpt-3.5-turbo
      messages: [
        { role: 'system', content: AGENT_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.0, // Deterministic output
      max_tokens: 1500,
      response_format: { type: 'json_object' } // Request JSON output
    });
    
    const content = response.choices[0].message.content;
    const insight = JSON.parse(content);
    
    // Validate required fields
    if (!insight.veracity || !insight.risk_level || !insight.summary) {
      throw new Error('Invalid LLM response format');
    }
    
    return insight;
    
  } catch (error) {
    console.error('[Agent] LLM analysis error:', error);
    
    // Fallback: Generate basic insight from heuristics
    return generateFallbackInsight(context);
  }
}

/**
 * Fallback insight generator (no LLM)
 */
function generateFallbackInsight(context) {
  const anomalyCount = context.anomalies.flags.length;
  const riskScore = context.anomalies.riskScore || 0;
  
  let riskLevel = 'LOW';
  if (riskScore >= 60) riskLevel = 'HIGH';
  else if (riskScore >= 30) riskLevel = 'MEDIUM';
  
  let veracity = 'UNKNOWN';
  if (context.accuracyComparison) {
    if (context.accuracyComparison.mismatch) {
      veracity = 'MISMATCH';
    } else if (context.accuracyComparison.claimed && context.accuracyComparison.measured) {
      veracity = 'MATCH';
    }
  }
  
  return {
    veracity,
    risk_level: riskLevel,
    confidence: 0.7,
    summary: `Automated analysis detected ${anomalyCount} anomalies with risk score ${riskScore}/100. ${context.stats.totalRatings} total ratings from blockchain.`,
    evidence: context.anomalies.flags,
    recommended_actions: riskLevel === 'HIGH' ? ['flag_model', 'request_review'] : ['continue_monitoring'],
    trust_indicators: {
      claimed_accuracy: context.accuracyComparison?.claimed || 0,
      measured_accuracy: context.accuracyComparison?.measured || 0,
      rating_authenticity: Math.max(0, 1 - (riskScore / 100)),
      community_consensus: Math.min(1, context.stats.totalRatings / 10)
    }
  };
}

/**
 * Notify frontend about high-risk findings
 */
async function notifyFrontend(slug, insight) {
  try {
    const webhookUrl = process.env.FRONTEND_NOTIFY_URL;
    if (!webhookUrl) {
      console.log('[Agent] No frontend webhook URL configured');
      return;
    }
    
    const fetch = (await import('node-fetch')).default;
    
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelSlug: slug,
        riskLevel: insight.risk_level,
        summary: insight.summary,
        timestamp: new Date().toISOString()
      })
    });
    
    console.log(`[Agent] Notified frontend about ${slug}`);
  } catch (error) {
    console.error('[Agent] Failed to notify frontend:', error.message);
  }
}

export default {
  runAgentJob,
  analyzeTrust
};
