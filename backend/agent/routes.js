import express from 'express';
import { runAgentJob } from './agent.js';
import { triggerRedTeamAnalysis } from './redteam.js';
import { client } from '../connect.js';
import { contract } from '../contract.js';
import tools from '../tools/tools.js';

const router = express.Router();

// POST /api/agent/analyze/:org/:model
// Manually trigger trust analysis for a model
// Handles slugs like "deepseek-ai/DeepSeek-V3.1-Base"
router.post('/analyze/:org/:model', async (req, res) => {
  try {
    const slug = `${req.params.org}/${req.params.model}`;
    console.log(`[Agent API] Manual analysis triggered for ${slug}`);
    
    const result = await runAgentJob(slug, 'manual_request');
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Agent API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/agent/analyze/:slug
// Manually trigger trust analysis for a simple model slug
// Handles slugs like "bert-base-uncased"
router.post('/analyze/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    console.log(`[Agent API] Manual analysis triggered for ${slug}`);
    
    const result = await runAgentJob(slug, 'manual_request');
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Agent API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/agent/insights/:org/:model
// Get latest insights for a model
router.get('/insights/:org/:model', async (req, res) => {
  try {
    const slug = `${req.params.org}/${req.params.model}`;
    const limit = parseInt(req.query.limit) || 5;
    
    const db = client.db('veriAI');
    const insights = await db.collection('agent_insights')
      .find({ modelSlug: slug })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    
    res.json({ success: true, data: insights });
  } catch (error) {
    console.error('[Agent API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/agent/insights/:slug
// Get latest insights for a simple model slug
router.get('/insights/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const limit = parseInt(req.query.limit) || 5;
    
    const db = client.db('veriAI');
    const insights = await db.collection('agent_insights')
      .find({ modelSlug: slug })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    
    res.json({ success: true, data: insights });
  } catch (error) {
    console.error('[Agent API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/agent/trust/:org/:model
// Get trust score and stats for a model
router.get('/trust/:org/:model', async (req, res) => {
  try {
    const slug = `${req.params.org}/${req.params.model}`;
    
    // Get on-chain stats
    const stats = await tools.get_model_stats(slug);
    
    // Get latest insight
    const db = client.db('veriAI');
    const latestInsight = await db.collection('agent_insights')
      .findOne({ modelSlug: slug }, { sort: { createdAt: -1 } });
    
    res.json({
      success: true,
      data: {
        trustScore: stats.trustScore,
        totalRatings: stats.totalRatings,
        avgScore: stats.avgScore,
        latestInsight: latestInsight || null
      }
    });
  } catch (error) {
    console.error('[Agent API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/agent/trust/:slug
// Get trust score and stats for a simple model slug
router.get('/trust/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    
    // Get on-chain stats
    const stats = await tools.get_model_stats(slug);
    
    // Get latest insight
    const db = client.db('veriAI');
    const latestInsight = await db.collection('agent_insights')
      .findOne({ modelSlug: slug }, { sort: { createdAt: -1 } });
    
    res.json({
      success: true,
      data: {
        trustScore: stats.trustScore,
        totalRatings: stats.totalRatings,
        avgScore: stats.avgScore,
        latestInsight: latestInsight || null
      }
    });
  } catch (error) {
    console.error('[Agent API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/agent/ratings/:org/:model
// Get on-chain ratings with explorer links
router.get('/ratings/:org/:model', async (req, res) => {
  try {
    const slug = `${req.params.org}/${req.params.model}`;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await tools.get_chain_ratings(slug, limit);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Agent API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/agent/ratings/:slug
// Get on-chain ratings for a simple model slug
router.get('/ratings/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await tools.get_chain_ratings(slug, limit);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Agent API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/agent/health
// Health check for agent service
router.get('/health', async (req, res) => {
  try {
    // Check blockchain connection
    const blockNumber = await contract.runner.provider.getBlockNumber();
    
    // Check OpenAI key exists
    const openaiConfigured = !!process.env.OPENAI_API_KEY;
    
    res.json({
      success: true,
      status: 'healthy',
      checks: {
        database: 'connected (shared with backend)',
        blockchain: `connected (block ${blockNumber})`,
        openai: openaiConfigured ? 'configured' : 'missing'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// POST /api/agent/redteam/:org/:model
// Trigger on-demand red-team security analysis
router.post('/redteam/:org/:model', async (req, res) => {
  try {
    const slug = `${req.params.org}/${req.params.model}`;
    console.log(`[Agent API] Red-team analysis triggered for ${slug}`);
    
    // Get model data
    const [modelCardResult, ratingsResult, stats] = await Promise.all([
      tools.get_model_card(slug),
      tools.get_chain_ratings(slug),
      tools.get_model_stats(slug)
    ]);
    
    // Run red-team analysis
    const analysis = await triggerRedTeamAnalysis(slug, {
      modelCard: modelCardResult.modelCard,
      chainRatings: ratingsResult.ratings || [],
      baselineTrustScore: stats.trustScore / 100,
      modelName: modelCardResult.modelCard?.modelId || slug
    });
    
    // Save to database
    const db = client.db('veriAI');
    const result = await db.collection('redteam_analyses').insertOne({
      modelSlug: slug,
      ...analysis,
      triggeredBy: 'manual_request',
      createdAt: new Date()
    });
    
    res.json({
      success: true,
      data: {
        analysisId: result.insertedId,
        ...analysis
      }
    });
  } catch (error) {
    console.error('[Agent API] Red-team error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/agent/redteam/:slug
// Trigger red-team for simple slug
router.post('/redteam/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    console.log(`[Agent API] Red-team analysis triggered for ${slug}`);
    
    const [modelCardResult, ratingsResult, stats] = await Promise.all([
      tools.get_model_card(slug),
      tools.get_chain_ratings(slug),
      tools.get_model_stats(slug)
    ]);
    
    const analysis = await triggerRedTeamAnalysis(slug, {
      modelCard: modelCardResult.modelCard,
      chainRatings: ratingsResult.ratings || [],
      baselineTrustScore: stats.trustScore / 100,
      modelName: modelCardResult.modelCard?.modelId || slug
    });
    
    const db = client.db('veriAI');
    const result = await db.collection('redteam_analyses').insertOne({
      modelSlug: slug,
      ...analysis,
      triggeredBy: 'manual_request',
      createdAt: new Date()
    });
    
    res.json({
      success: true,
      data: {
        analysisId: result.insertedId,
        ...analysis
      }
    });
  } catch (error) {
    console.error('[Agent API] Red-team error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/agent/redteam/:org/:model
// Get latest red-team analysis
router.get('/redteam/:org/:model', async (req, res) => {
  try {
    const slug = `${req.params.org}/${req.params.model}`;
    
    const db = client.db('veriAI');
    const analysis = await db.collection('redteam_analyses')
      .findOne({ modelSlug: slug }, { sort: { createdAt: -1 } });
    
    if (!analysis) {
      return res.status(404).json({ error: 'No red-team analysis found for this model' });
    }
    
    res.json({ success: true, data: analysis });
  } catch (error) {
    console.error('[Agent API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/agent/redteam/:slug
// Get latest red-team analysis for simple slug
router.get('/redteam/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    
    const db = client.db('veriAI');
    const analysis = await db.collection('redteam_analyses')
      .findOne({ modelSlug: slug }, { sort: { createdAt: -1 } });
    
    if (!analysis) {
      return res.status(404).json({ error: 'No red-team analysis found for this model' });
    }
    
    res.json({ success: true, data: analysis });
  } catch (error) {
    console.error('[Agent API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/agent/llm-search
// Intelligent model search using GPT
router.post('/llm-search', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`[LLM Search] Processing query: "${query}"`);
    
    // Import OpenAI dynamically to avoid circular deps
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Get models from cache
    const { default: modelsCache } = await import('../models-cache.js');
    const allModels = modelsCache.getAll();
    
    // Build context from available models
    const modelsList = allModels.slice(0, 50).map(m => 
      `${m.modelSlug}: ${m.benchmarkScore}/100 (${m.totalRatings} ratings)`
    ).join('\n');
    
    // Get DB models for additional context
    const db = client.db('veriAI');
    const dbModels = await db.collection('models').find({}).limit(20).toArray();
    
    // Use GPT to understand the query and recommend models
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 800,
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant that helps users find the best models for their needs. 
You have access to a database of models with trust scores, ratings, and blockchain verification data.

Available models in our database:
${modelsList}

When a user asks a question, analyze their intent and recommend 1-3 models that best match their needs.
For each recommendation, provide:
1. Model ID (exact slug)
2. Why it's suitable
3. Trust score and ratings
4. Key capabilities

Format your response as a conversational recommendation with clear model IDs that can be clicked.`
        },
        {
          role: 'user',
          content: query
        }
      ]
    });
    
    const llmResponse = completion.choices[0].message.content;
    
    // Extract mentioned model IDs using regex
    const modelIdPattern = /\b[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+\b|\b(?:bert|gpt|llama|mistral|falcon|stable-diffusion|whisper|clip|t5)[a-zA-Z0-9_.-]*\b/gi;
    const mentionedModels = [...new Set((llmResponse.match(modelIdPattern) || []))];
    
    // Fetch detailed data for mentioned models
    const modelDetails = await Promise.all(
      mentionedModels.slice(0, 3).map(async (modelId) => {
        try {
          // Try to get from cache first
          let modelData = allModels.find(m => 
            m.modelSlug.toLowerCase().includes(modelId.toLowerCase())
          );
          
          // If not in cache, try HuggingFace API
          if (!modelData) {
            const fetch = (await import('node-fetch')).default;
            const hfResponse = await fetch(`https://huggingface.co/api/models/${modelId}`, {
              headers: process.env.HUGGINGFACE_API_KEY 
                ? { 'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}` }
                : {}
            });
            
            if (hfResponse.ok) {
              const hfData = await hfResponse.json();
              modelData = {
                modelSlug: modelId,
                source: 'huggingface',
                downloads: hfData.downloads,
                likes: hfData.likes,
                tags: hfData.tags,
                pipeline_tag: hfData.pipeline_tag
              };
            }
          }
          
          return modelData;
        } catch (err) {
          console.error(`[LLM Search] Error fetching ${modelId}:`, err.message);
          return null;
        }
      })
    );
    
    res.json({
      success: true,
      query,
      llmResponse,
      recommendedModels: modelDetails.filter(Boolean),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[LLM Search] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
