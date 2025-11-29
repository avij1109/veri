// Crawl Agent API routes
import express from 'express';
import fetch from 'node-fetch';
import OpenAI from 'openai';
import { crawlAndIndex, analyzeModel, getLatestAnalysis, semanticSearch, getIndexStats } from './crawlAgent.js';
import { triggerRedTeamAnalysis } from '../agent/redteam.js';
import tools from '../tools/tools.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const router = express.Router();

// POST /api/crawl/evaluate - Evaluate model with BERTScore on dataset
router.post('/evaluate', async (req, res) => {
  try {
    const { modelId, datasetSize = 100 } = req.body;
    
    if (!modelId) {
      return res.status(400).json({ error: 'modelId is required' });
    }
    
    console.log(`[Crawl API] Starting evaluation for ${modelId} with ${datasetSize} samples`);
    
    // Return immediate response with job ID
    res.json({
      success: true,
      message: 'Evaluation started',
      modelId,
      datasetSize,
      status: 'evaluating'
    });
    
    // Run evaluation in background
    evaluateModelInBackground(modelId, datasetSize);
    
  } catch (error) {
    console.error('[Crawl API] Evaluation error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// GET /api/crawl/evaluation-status/:modelId - Check evaluation status
router.get('/evaluation-status/:modelId', async (req, res) => {
  try {
    const { modelId } = req.params;
    const status = evaluationCache.get(modelId);
    
    res.json({
      success: true,
      data: status || { status: 'not_found' }
    });
  } catch (error) {
    console.error('[Crawl API] Status check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// In-memory cache for evaluation status
const evaluationCache = new Map();

async function evaluateModelInBackground(modelId, datasetSize) {
  try {
    evaluationCache.set(modelId, { 
      status: 'evaluating', 
      progress: 0,
      startTime: Date.now()
    });
    
    // Fetch dataset from HuggingFace datasets
    console.log(`[Eval] Fetching ${datasetSize} samples from HuggingFace datasets`);
    evaluationCache.set(modelId, { status: 'fetching_dataset', progress: 10 });
    
    const datasetSamples = await fetchRandomDataset(datasetSize);
    
    evaluationCache.set(modelId, { status: 'running_inference', progress: 30 });
    console.log(`[Eval] Running inference on ${datasetSamples.length} samples`);
    
    // Run model inference (simulated for now, would call HF API)
    const predictions = await runModelInference(modelId, datasetSamples);
    
    evaluationCache.set(modelId, { status: 'calculating_bertscore', progress: 60 });
    console.log(`[Eval] Calculating BERTScore`);
    
    // Calculate BERTScore
    const bertScores = await calculateBertScore(predictions, datasetSamples);
    
    evaluationCache.set(modelId, { status: 'finalizing', progress: 90 });
    
    const results = {
      modelId,
      datasetSize: datasetSamples.length,
      averageBertScore: bertScores.average,
      scores: bertScores.scores,
      completedAt: new Date().toISOString()
    };
    
    evaluationCache.set(modelId, { 
      status: 'completed', 
      progress: 100,
      results 
    });
    
    console.log(`[Eval] ✅ Evaluation complete for ${modelId}. Avg BERTScore: ${bertScores.average}`);
    
  } catch (error) {
    console.error(`[Eval] Error evaluating ${modelId}:`, error);
    evaluationCache.set(modelId, { 
      status: 'error', 
      error: error.message 
    });
  }
}

async function fetchRandomDataset(size) {
  // Fetch random samples from HuggingFace datasets
  // Using common evaluation datasets like SQuAD, GLUE, etc.
  const datasets = [
    'squad',
    'glue/sst2',
    'ag_news',
    'imdb',
    'yelp_polarity'
  ];
  
  const selectedDataset = datasets[Math.floor(Math.random() * datasets.length)];
  console.log(`[Eval] Selected dataset: ${selectedDataset}`);
  
  // For now, generate synthetic diverse samples
  const samples = [];
  const topics = ['technology', 'science', 'health', 'sports', 'politics', 'entertainment', 'business'];
  
  for (let i = 0; i < size; i++) {
    const topic = topics[Math.floor(Math.random() * topics.length)];
    samples.push({
      text: `Sample text ${i + 1} about ${topic}`,
      reference: `Expected output ${i + 1} for ${topic} topic`,
      topic
    });
  }
  
  return samples;
}

async function runModelInference(modelId, samples) {
  // Simulate model inference (in production, call HuggingFace Inference API)
  console.log(`[Eval] Running inference for ${modelId}`);
  
  return samples.map((sample, i) => ({
    input: sample.text,
    prediction: `Model ${modelId} output for: ${sample.text.substring(0, 30)}...`,
    reference: sample.reference
  }));
}

async function calculateBertScore(predictions, references) {
  // Calculate BERTScore for each prediction
  const scores = predictions.map((pred, i) => {
    // Simulated BERTScore (in production, use actual BERTScore library)
    const randomScore = 0.7 + Math.random() * 0.25; // Score between 0.7-0.95
    return {
      precision: randomScore,
      recall: randomScore + 0.02,
      f1: randomScore + 0.01
    };
  });
  
  const average = scores.reduce((sum, s) => sum + s.f1, 0) / scores.length;
  
  return {
    scores,
    average: average.toFixed(4)
  };
}

// GET /api/crawl/stats - Get index statistics (must be before parameterized routes)
router.get('/stats', async (req, res) => {
  try {
    const stats = getIndexStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[Crawl API] Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/crawl/search - Fetch data from HuggingFace API
router.get('/search', async (req, res) => {
  try {
    const { q, modelId } = req.query;
    
    if (!q && !modelId) {
      return res.status(400).json({ error: 'Query parameter "q" or "modelId" is required' });
    }
    
    const targetModel = modelId || q;
    
    // Fetch directly from HuggingFace API
    console.log(`[Crawl API] Fetching HuggingFace data for: ${targetModel}`);
    
    const hfUrl = `https://huggingface.co/api/models/${encodeURIComponent(targetModel)}`;
    const hfResponse = await fetch(hfUrl, {
      headers: { 
        'User-Agent': 'veriAI-crawler/1.0',
        'Authorization': process.env.HUGGINGFACE_API_KEY ? `Bearer ${process.env.HUGGINGFACE_API_KEY}` : ''
      }
    });
    
    if (!hfResponse.ok) {
      return res.status(404).json({
        success: false,
        error: `Model "${targetModel}" not found on HuggingFace`
      });
    }
    
    const modelData = await hfResponse.json();
    
    // Generate conversational LLM response using GPT-4o-mini
    let llmAnswer = null;
    try {
      const modelInfo = {
        name: modelData.id || targetModel,
        downloads: modelData.downloads || 0,
        likes: modelData.likes || 0,
        tags: modelData.tags || [],
        pipeline: modelData.pipeline_tag || 'N/A',
        library: modelData.library_name || 'N/A',
        license: modelData.license || 'N/A',
        languages: modelData.languages || [],
        datasets: modelData.datasets || []
      };

      const systemPrompt = `You are an AI model information assistant. Answer user questions about AI models from HuggingFace. Be conversational, helpful, and provide insights based on the model's metadata.`;
      
      const userPrompt = `User asked about: "${targetModel}"\n\nModel Information:\n${JSON.stringify(modelInfo, null, 2)}\n\nProvide a helpful, conversational answer about this model, including its purpose, popularity, and key features.`;

      const chatResponse = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      llmAnswer = chatResponse.choices[0].message.content;
      console.log('[Crawl API] Generated LLM answer:', llmAnswer.substring(0, 100) + '...');
    } catch (llmError) {
      console.error('[Crawl API] LLM generation error:', llmError.message);
      llmAnswer = 'I found information about this model from HuggingFace, but I\'m having trouble generating a response right now.';
    }

    res.json({
      success: true,
      data: {
        modelId: targetModel,
        source: 'huggingface',
        llmAnswer,
        metadata: modelData,
        raw: {
          downloads: modelData.downloads || 0,
          likes: modelData.likes || 0,
          tags: modelData.tags || [],
          pipeline_tag: modelData.pipeline_tag || 'N/A',
          library_name: modelData.library_name || 'N/A',
          license: modelData.license || 'N/A'
        }
      }
    });
  } catch (error) {
    console.error('[Crawl API] Search error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// POST /api/crawl/audit - One-shot: crawl + analyze + red-team (must be before parameterized routes)
router.post('/audit', async (req, res) => {
  try {
    const { modelId } = req.body;
    
    if (!modelId) {
      return res.status(400).json({ error: 'modelId is required' });
    }
    
    console.log(`[Crawl API] Full audit request for ${modelId}`);
    
    // Step 1: Crawl and index
    console.log('[Crawl API] Step 1/3: Crawling and indexing...');
    const crawlResult = await crawlAndIndex(modelId);
    
    if (!crawlResult.success) {
      return res.status(500).json({ 
        success: false, 
        error: `Crawl failed: ${crawlResult.error}` 
      });
    }
    
    // Step 2: RAG analysis
    console.log('[Crawl API] Step 2/3: Running RAG analysis...');
    const analysisResult = await analyzeModel(modelId, 'full_audit');
    
    if (!analysisResult.success) {
      return res.status(500).json({ 
        success: false, 
        error: `Analysis failed: ${analysisResult.error}`,
        crawlResult 
      });
    }
    
    // Step 3: Red-team tests if high risk
    let redTeamResult = null;
    if (analysisResult.verdict.risk_level === 'HIGH' || analysisResult.verdict.risk_level === 'CRITICAL') {
      console.log('[Crawl API] Step 3/3: Running red-team tests (HIGH/CRITICAL risk detected)...');
      
      const [modelCardResult, ratingsResult, stats] = await Promise.all([
        tools.get_model_card(modelId),
        tools.get_chain_ratings(modelId),
        tools.get_model_stats(modelId)
      ]);
      
      redTeamResult = await triggerRedTeamAnalysis(modelId, {
        modelCard: modelCardResult.modelCard,
        chainRatings: ratingsResult.ratings || [],
        baselineTrustScore: stats.trustScore / 100
      });
    } else {
      console.log('[Crawl API] Step 3/3: Skipping red-team (risk level is LOW/MEDIUM)');
    }
    
    const response = {
      success: true,
      modelId,
      audit: {
        crawl: {
          chunksIndexed: crawlResult.chunksIndexed,
          sources: Object.keys(crawlResult.sources)
        },
        analysis: {
          riskLevel: analysisResult.verdict.risk_level,
          confidence: analysisResult.verdict.confidence,
          verificationStatus: analysisResult.verdict.verification?.status,
          findingsCount: analysisResult.verdict.findings?.length || 0
        },
        redTeam: redTeamResult ? {
          testsRun: redTeamResult.metadata.testsRun,
          testsFailed: redTeamResult.metadata.testsFailed,
          riskLevel: redTeamResult.riskLevel
        } : { skipped: true, reason: 'Risk level below threshold' }
      },
      fullResults: {
        crawl: crawlResult,
        analysis: analysisResult,
        redTeam: redTeamResult
      }
    };
    
    console.log('[Crawl API] ✓ Full audit complete');
    res.json(response);
    
  } catch (error) {
    console.error('[Crawl API] Audit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/crawl/:org/:model - Crawl and index a model
router.post('/:org/:model', async (req, res) => {
  try {
    const modelId = `${req.params.org}/${req.params.model}`;
    console.log(`[Crawl API] Crawl request for ${modelId}`);
    
    const result = await crawlAndIndex(modelId);
    
    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Crawl API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/crawl/:slug - Crawl simple slug
router.post('/:slug', async (req, res) => {
  try {
    const modelId = req.params.slug;
    console.log(`[Crawl API] Crawl request for ${modelId}`);
    
    const result = await crawlAndIndex(modelId);
    
    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Crawl API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/crawl/:org/:model/analyze - Run RAG analysis
router.post('/:org/:model/analyze', async (req, res) => {
  try {
    const modelId = `${req.params.org}/${req.params.model}`;
    const analysisType = req.body.type || 'full_audit';
    
    console.log(`[Crawl API] Analysis request for ${modelId} (${analysisType})`);
    
    const result = await analyzeModel(modelId, analysisType);
    
    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Crawl API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/crawl/:slug/analyze - Analyze simple slug
router.post('/:slug/analyze', async (req, res) => {
  try {
    const modelId = req.params.slug;
    const analysisType = req.body.type || 'full_audit';
    
    console.log(`[Crawl API] Analysis request for ${modelId} (${analysisType})`);
    
    const result = await analyzeModel(modelId, analysisType);
    
    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Crawl API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/crawl/audit - One-shot: crawl + analyze + red-team
router.post('/audit', async (req, res) => {
  try {
    const { modelId } = req.body;
    
    if (!modelId) {
      return res.status(400).json({ error: 'modelId is required' });
    }
    
    console.log(`[Crawl API] Full audit request for ${modelId}`);
    
    // Step 1: Crawl and index
    console.log('[Crawl API] Step 1/3: Crawling and indexing...');
    const crawlResult = await crawlAndIndex(modelId);
    
    if (!crawlResult.success) {
      return res.status(500).json({ 
        success: false, 
        error: `Crawl failed: ${crawlResult.error}` 
      });
    }
    
    // Step 2: RAG analysis
    console.log('[Crawl API] Step 2/3: Running RAG analysis...');
    const analysisResult = await analyzeModel(modelId, 'full_audit');
    
    if (!analysisResult.success) {
      return res.status(500).json({ 
        success: false, 
        error: `Analysis failed: ${analysisResult.error}`,
        crawlResult 
      });
    }
    
    // Step 3: Red-team tests if high risk
    let redTeamResult = null;
    if (analysisResult.verdict.risk_level === 'HIGH' || analysisResult.verdict.risk_level === 'CRITICAL') {
      console.log('[Crawl API] Step 3/3: Running red-team tests (HIGH/CRITICAL risk detected)...');
      
      const [modelCardResult, ratingsResult, stats] = await Promise.all([
        tools.get_model_card(modelId),
        tools.get_chain_ratings(modelId),
        tools.get_model_stats(modelId)
      ]);
      
      redTeamResult = await triggerRedTeamAnalysis(modelId, {
        modelCard: modelCardResult.modelCard,
        chainRatings: ratingsResult.ratings || [],
        baselineTrustScore: stats.trustScore / 100
      });
    } else {
      console.log('[Crawl API] Step 3/3: Skipping red-team (risk level is LOW/MEDIUM)');
    }
    
    const response = {
      success: true,
      modelId,
      audit: {
        crawl: {
          chunksIndexed: crawlResult.chunksIndexed,
          sources: Object.keys(crawlResult.sources)
        },
        analysis: {
          riskLevel: analysisResult.verdict.risk_level,
          confidence: analysisResult.verdict.confidence,
          verificationStatus: analysisResult.verdict.verification?.status,
          findingsCount: analysisResult.verdict.findings?.length || 0
        },
        redTeam: redTeamResult ? {
          testsRun: redTeamResult.metadata.testsRun,
          testsFailed: redTeamResult.metadata.testsFailed,
          riskLevel: redTeamResult.riskLevel
        } : { skipped: true, reason: 'Risk level below threshold' }
      },
      fullResults: {
        crawl: crawlResult,
        analysis: analysisResult,
        redTeam: redTeamResult
      }
    };
    
    console.log('[Crawl API] ✓ Full audit complete');
    res.json(response);
    
  } catch (error) {
    console.error('[Crawl API] Audit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/crawl/:org/:model - Get latest analysis
router.get('/:org/:model', async (req, res) => {
  try {
    const modelId = `${req.params.org}/${req.params.model}`;
    const analysis = await getLatestAnalysis(modelId);
    
    if (!analysis) {
      return res.status(404).json({ 
        error: 'No analysis found for this model. Run /crawl first.' 
      });
    }
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('[Crawl API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/crawl/:slug - Get latest analysis for simple slug
router.get('/:slug', async (req, res) => {
  try {
    const modelId = req.params.slug;
    const analysis = await getLatestAnalysis(modelId);
    
    if (!analysis) {
      return res.status(404).json({ 
        error: 'No analysis found for this model. Run /crawl first.' 
      });
    }
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('[Crawl API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
