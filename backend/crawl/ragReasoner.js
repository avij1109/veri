// RAG (Retrieval Augmented Generation) reasoner with GPT-4o-mini
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

/**
 * Run RAG analysis with retrieved contexts
 */
export async function runRagAnalysis(modelId, taskPrompt, contexts) {
  console.log(`[RAG] Running analysis for ${modelId} with ${contexts.length} contexts`);
  
  if (!contexts || contexts.length === 0) {
    throw new Error('No contexts provided for RAG analysis');
  }
  
  // Build context block with citations
  const contextBlock = contexts.map((ctx, i) => {
    const source = ctx.source || 'unknown';
    const url = ctx.sourceUrl || ctx.metadata?.url || 'no-url';
    const text = ctx.text || ctx.metadata?.text || '';
    
    return `[CONTEXT ${i + 1}]\nSource: ${source}\nURL: ${url}\nContent:\n${text}\n`;
  }).join('\n---\n\n');
  
  // System prompt with strict instructions
  const systemPrompt = `You are an expert AI model auditor and security analyst. Your role is to analyze AI models for trust, security, and quality issues.

CRITICAL RULES:
1. Use ONLY the provided contexts - do not use external knowledge
2. Cite sources explicitly for EVERY claim using [CONTEXT N] format
3. Return ONLY valid JSON - no markdown, no explanations outside JSON
4. Be objective and evidence-based
5. Flag contradictions and missing information

Your analysis must be thorough, focusing on:
- Security vulnerabilities (prompt injection, data poisoning, etc.)
- Training data quality and provenance
- Performance claims vs evidence
- Blockchain trust signals
- Community sentiment and adoption`;

  // User prompt with task and contexts
  const userPrompt = `${taskPrompt}

${contextBlock}

Based ONLY on the contexts above, provide a comprehensive analysis in this EXACT JSON format:
{
  "summary": "Brief 2-3 sentence summary of key findings",
  "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
  "confidence": 0.0-1.0,
  "findings": [
    {
      "category": "security|quality|trust|performance",
      "severity": "low|medium|high|critical",
      "title": "Short title",
      "detail": "Detailed explanation",
      "evidence": ["[CONTEXT N] quote or paraphrase"],
      "impact": "Potential impact if not addressed"
    }
  ],
  "contradictions": [
    {
      "claim": "What was claimed",
      "contradiction": "What contradicts it",
      "sources": ["[CONTEXT N]", "[CONTEXT M]"]
    }
  ],
  "recommendations": [
    {
      "action": "What to do",
      "priority": "low|medium|high|critical",
      "reasoning": "Why this matters"
    }
  ],
  "missing_information": ["What critical info is missing"],
  "trust_signals": {
    "positive": ["List positive signals found"],
    "negative": ["List negative signals found"],
    "neutral": ["List neutral observations"]
  }
}`;

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1, // Low temperature for consistency
      max_tokens: 2000
    });
    
    const content = response.choices[0].message.content;
    
    // Parse JSON
    let verdict;
    try {
      // Try to extract JSON from markdown code blocks first
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        verdict = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        verdict = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('[RAG] JSON parse error:', parseError.message);
      throw new Error('Failed to parse LLM response as JSON');
    }
    
    // Validate required fields
    if (!verdict.summary || !verdict.risk_level) {
      throw new Error('Invalid RAG response: missing required fields');
    }
    
    console.log(`[RAG] Analysis complete: ${verdict.risk_level} risk, ${verdict.findings?.length || 0} findings`);
    
    return {
      success: true,
      verdict,
      model: CHAT_MODEL,
      contextsUsed: contexts.length,
      usage: response.usage
    };
    
  } catch (error) {
    console.error('[RAG] Analysis failed:', error.message);
    return {
      success: false,
      error: error.message,
      fallback: {
        summary: 'Analysis failed due to technical error',
        risk_level: 'MEDIUM',
        confidence: 0.3,
        findings: [{
          category: 'system',
          severity: 'medium',
          title: 'Analysis Error',
          detail: error.message,
          evidence: [],
          impact: 'Could not complete full analysis'
        }]
      }
    };
  }
}

/**
 * Generate task prompt for different analysis types
 */
export function generateTaskPrompt(analysisType, modelId, additionalContext = {}) {
  const basePrompt = `Analyze the AI model "${modelId}" for trustworthiness, security, and quality.`;
  
  const prompts = {
    'full_audit': `${basePrompt}

Perform a comprehensive audit covering:
1. Security vulnerabilities (injection attacks, poisoning, adversarial robustness)
2. Training data quality and provenance
3. Performance claims validation
4. Blockchain trust metrics
5. Community adoption and sentiment
6. License and ethical considerations`,
    
    'security_focused': `${basePrompt}

Focus specifically on security aspects:
1. Prompt injection vulnerabilities
2. Data poisoning indicators
3. Model robustness to adversarial inputs
4. Privacy and data leakage risks
5. Access control and authentication`,
    
    'trust_verification': `${basePrompt}

Focus on trust and authenticity:
1. Validate performance claims against evidence
2. Check for contradictions in documentation
3. Assess blockchain trust signals
4. Evaluate community consensus
5. Identify manipulation indicators`,
    
    'quick_summary': `${basePrompt}

Provide a quick summary focusing on:
1. Overall risk level
2. Top 3 most critical findings
3. Immediate action items`
  };
  
  return prompts[analysisType] || prompts['full_audit'];
}
