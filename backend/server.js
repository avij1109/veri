import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import crypto from "crypto";
import { connectDB, client } from "./connect.js";
import { evaluateModelPerformance, getPopularModels } from './evaluation-service.js';
import { evaluateTextOutput } from './model-agnostic-evaluation.js';
import { bertScoreClient } from './bert-score-client.js';
import { TOP_50_MODELS, getModelById, searchModels, getTopModelsByAccuracy, getModelRecommendations as getCacheModelRecommendations } from './models-cache.js';
import VeriAIAgent from './veriai-agent.js';
import agentRoutes from './agent/routes.js';
import crawlRoutes from './crawl/routes.js';
import { 
  initializeDatabase, 
  storeEvaluationResults, 
  getEvaluationResults, 
  getTopModelsByTask,
  getModelRecommendations,
  getModelStats,
  getAllEvaluations,
  storeAutomatedEvaluationResults,
  getCachedEvaluationResults,
  getAllEvaluationResults,
  getRecentEvaluationResults} from './database.js'
import LocalEvaluationService from './local-evaluation-service.js';

const app = express();
app.use(express.json());
app.use(cors());

// Initialize evaluation database
await initializeDatabase();

// Initialize local evaluation service
const localEvaluationService = new LocalEvaluationService();

// Endpoint to evaluate a model
app.post('/evaluate-model', async (req, res) => {
  try {
    const { modelId, modelSlug, taskType } = req.body;
    const modelIdentifier = modelId || modelSlug;
    
    if (!modelIdentifier) {
      return res.status(400).json({ 
        success: false, 
        error: 'modelId or modelSlug is required' 
      });
    }
    
    console.log(`[API] Starting evaluation for ${modelIdentifier}`);
    
    // Check if we have a recent evaluation
    const existingEvaluation = await getEvaluationResults(modelIdentifier);
    if (existingEvaluation && existingEvaluation.createdAt) {
      const hoursSinceEval = (new Date() - new Date(existingEvaluation.createdAt)) / (1000 * 60 * 60);
      if (hoursSinceEval < 24) {
        console.log(`[API] Using cached evaluation for ${modelIdentifier}`);
        return res.json({
          success: true,
          evaluation: existingEvaluation,
          cached: true
        });
      }
    }
    
    // Perform evaluation - let the service auto-detect task type if not provided
    const evaluationResults = await evaluateModelPerformance(modelIdentifier, taskType);
    
    // Store results in database
    const evaluationHash = await storeEvaluationResults(evaluationResults);
    
    res.json({
      success: true,
      evaluation: evaluationResults,
      metadataHash: evaluationHash
    });
  } catch (error) {
    console.error('[API] Evaluation failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Model-agnostic evaluation endpoint (user provides model outputs)
app.post('/evaluate-outputs', async (req, res) => {
  try {
    const { modelId, taskType, outputs, customTestCases } = req.body;
    
    if (!modelId) {
      return res.status(400).json({ 
        success: false, 
        error: 'modelId is required' 
      });
    }
    
    if (!outputs || !Array.isArray(outputs)) {
      return res.status(400).json({ 
        success: false, 
        error: 'outputs array is required with format: [{prompt: "...", generated_text: "...", expected_output: "..."}]' 
      });
    }
    
    console.log(`[API] Starting model-agnostic evaluation for ${modelId} with ${outputs.length} outputs`);
    
    const evaluationResults = await evaluateTextOutput({
      modelId,
      taskType: taskType || 'text-generation',
      userProvidedOutputs: outputs,
      customTestCases
    });
    
    // Store results in database
    const evaluationHash = await storeEvaluationResults(evaluationResults);
    
    res.json({
      success: true,
      evaluation: evaluationResults,
      metadataHash: evaluationHash,
      note: "Model-agnostic evaluation based on provided outputs"
    });
  } catch (error) {
    console.error('[API] Model-agnostic evaluation failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===========================================
// AUTOMATED EVALUATION API ENDPOINTS
// ===========================================

// Trigger evaluation manually for a specific model
app.post('/evaluate-local-model', async (req, res) => {
  try {
    const { modelId, taskType, forceEvaluation } = req.body; // Removed modelType
    
    if (!modelId || !taskType) {
      return res.status(400).json({ 
        success: false, 
        error: 'modelId and taskType are required' 
      });
    }
    
    console.log(`[API] Manual evaluation request for ${modelId} (${taskType})`);
    
    let result;
    
    if (forceEvaluation) {
      // Force fresh evaluation (bypass cache)
      result = await localEvaluationService.evaluateModel(modelId, taskType);
      await storeAutomatedEvaluationResults(result);
    } else {
      // Check cache first, evaluate if needed
      result = await getCachedEvaluationResults(modelId, taskType);
      if (!result) {
        result = await localEvaluationService.evaluateModel(modelId, taskType);
        await storeAutomatedEvaluationResults(result);
      }
    }
    
    res.json({
      success: true,
      evaluation: result,
      cached: !forceEvaluation && result.evaluatedAt,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] Manual evaluation failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get evaluation results for a specific model
app.get('/model/:modelId/evaluation', async (req, res) => {
  try {
    const { modelId } = req.params;
    const { taskType } = req.query;
    
    console.log(`[API] Getting evaluation results for ${modelId}`);
    
    let result;
    if (taskType) {
      result = await getCachedEvaluationResults(modelId, taskType);
    } else {
      // Get all evaluations for this model
      const allResults = await getAllEvaluationResults();
      result = allResults.filter(r => r.modelId === modelId);
    }
    
    if (!result || (Array.isArray(result) && result.length === 0)) {
      return res.status(404).json({ 
        success: false, 
        error: 'No evaluation results found for this model' 
      });
    }
    
    res.json({
      success: true,
      evaluation: result,
      found: true
    });
  } catch (error) {
    console.error('[API] Failed to get evaluation results:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get top models by task type
app.get('/top-models/:taskType', async (req, res) => {
  try {
    const { taskType } = req.params;
    const { limit = 5 } = req.query;
    
    console.log(`[API] Getting top models for task: ${taskType}`);
    
    const topModels = await getTopModelsByTask(taskType, parseInt(limit));
    
    res.json({
      success: true,
      taskType,
      topModels: topModels.map(model => ({
        modelId: model.modelId,
        accuracy: model.accuracy,
        samplesTested: model.samplesTested,
        evaluatedAt: model.evaluatedAt,
        status: model.status
      })),
      count: topModels.length
    });
  } catch (error) {
    console.error('[API] Failed to get top models:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get all evaluation results
app.get('/evaluations', async (req, res) => {
  try {
    const { taskType, status, sortBy = 'accuracy' } = req.query;
    
    console.log(`[API] Getting all evaluations with filters: taskType=${taskType}, status=${status}`);
    
    let results = await getAllEvaluationResults(taskType);
    
    // Filter by status if provided
    if (status) {
      results = results.filter(r => r.status === status);
    }
    
    // Sort results
    if (sortBy === 'accuracy') {
      results.sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0));
    } else if (sortBy === 'date') {
      results.sort((a, b) => new Date(b.evaluatedAt) - new Date(a.evaluatedAt));
    }
    
    res.json({
      success: true,
      evaluations: results.map(result => ({
        modelId: result.modelId,
        taskType: result.taskType,
        accuracy: result.accuracy,
        samplesTested: result.samplesTested,
        successfulEvaluations: result.successfulEvaluations,
        evaluatedAt: result.evaluatedAt,
        status: result.status,
        error: result.error
      })),
      count: results.length,
      summary: {
        totalModels: results.length,
        successfulEvaluations: results.filter(r => r.status === 'completed').length,
        failedEvaluations: results.filter(r => r.status === 'failed').length,
        averageAccuracy: results.filter(r => r.status === 'completed').length > 0 
          ? results.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.accuracy, 0) / results.filter(r => r.status === 'completed').length
          : 0
      }
    });
  } catch (error) {
    console.error('[API] Failed to get evaluations:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get scheduler status (now refers to separate automation process)
app.get('/scheduler/status', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Scheduler is now running as a separate automation process',
      instructions: 'Run automation.js in a separate terminal to start automated evaluations',
      command: 'node automation.js'
    });
  } catch (error) {
    console.error('[API] Failed to get scheduler status:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Control scheduler (now refers to separate automation process)
app.post('/scheduler/control', async (req, res) => {
  try {
    res.json({ 
      success: false, 
      message: 'Scheduler control is now handled by the separate automation process',
      instructions: 'Use the automation.js process to control automated evaluations',
      commands: {
        start: 'node automation.js',
        stop: 'Press Ctrl+C in the automation.js terminal'
      }
    });
  } catch (error) {
    console.error('[API] Scheduler control failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===========================================
// BENCHMARKING API ENDPOINTS
// ===========================================

// Real benchmarking endpoints
app.post('/api/benchmark/real', async (req, res) => {
  try {
    const { taskType, modelName, datasetId } = req.body;
    
    console.log(`Starting real benchmark: ${taskType}, ${modelName}, ${datasetId}`);
    
    const { BenchmarkService } = await import('./benchmark-service.js');
    const benchmarkService = new BenchmarkService();
    
    const result = await benchmarkService.runComprehensiveBenchmark(
      taskType || 'text-classification',
      modelName || 'local/enhanced-heuristic', 
      datasetId || 'ag_news'
    );
    
    res.json({
      success: true,
      benchmarkId: result.benchmarkId,
      result: result
    });
  } catch (error) {
    console.error('Real benchmark error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Model comparison endpoint
app.post('/api/benchmark/compare', async (req, res) => {
  try {
    const { models, taskType, datasetId } = req.body;
    
    if (!models || !Array.isArray(models) || models.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Models array is required and must not be empty'
      });
    }
    
    console.log(`Starting model comparison: ${models.join(', ')}`);
    
    const { BenchmarkService } = await import('./benchmark-service.js');
    const benchmarkService = new BenchmarkService();
    
    const result = await benchmarkService.runModelComparison(
      models,
      taskType || 'text-classification',
      datasetId || 'ag_news'
    );
    
    res.json({
      success: true,
      comparisonId: result.comparisonId,
      leaderboard: result
    });
  } catch (error) {
    console.error('Model comparison error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Available datasets endpoint
app.get('/api/datasets', async (req, res) => {
  try {
    const { default: RealDatasetLoader } = await import('./real-datasets.js');
    const realDatasets = new RealDatasetLoader();
    const datasets = await realDatasets.getAvailableDatasets();
    
    res.json({
      success: true,
      datasets: datasets
    });
  } catch (error) {
    console.error('Get datasets error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Available models endpoint (for hybrid evaluation)
app.get('/api/models/available', async (req, res) => {
  try {
    const { default: RealModelService } = await import('./real-model-service.js');
    const modelService = new RealModelService();
    const models = modelService.getAvailableModels();
    
    res.json({
      success: true,
      models: models
    });
  } catch (error) {
    console.error('Get models error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Hybrid evaluation endpoints
app.post('/api/evaluate-hybrid', async (req, res) => {
  try {
    const { modelId, taskType = 'text-classification' } = req.body;
    
    if (!modelId) {
      return res.status(400).json({ 
        success: false, 
        error: 'modelId is required' 
      });
    }

    console.log(`[API] Hybrid evaluation request: ${modelId} (${taskType})`);
    
    const { default: HybridEvaluationService } = await import('./hybrid-evaluation-service.js');
    const hybridService = new HybridEvaluationService();
    
    const result = await hybridService.evaluateModel(modelId, taskType);
    
    res.json({
      success: true,
      evaluation: result,
      isMock: result.status === 'completed_mock',
      evaluationType: result.metadata?.evaluationType || 'unknown'
    });
  } catch (error) {
    console.error('Hybrid evaluation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Model comparison with hybrid support
app.post('/api/benchmark/hybrid-compare', async (req, res) => {
  try {
    const { models, taskType = 'text-classification' } = req.body;
    
    if (!models || !Array.isArray(models) || models.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Models array is required and must not be empty'
      });
    }
    
    console.log(`[API] Hybrid model comparison: ${models.join(', ')}`);
    
    const { default: HybridEvaluationService } = await import('./hybrid-evaluation-service.js');
    const hybridService = new HybridEvaluationService();
    
    const leaderboard = await hybridService.evaluateMultipleModels(models, taskType);
    
    res.json({
      success: true,
      comparisonId: leaderboard.comparisonId,
      leaderboard: leaderboard,
      summary: leaderboard.summary
    });
  } catch (error) {
    console.error('Hybrid model comparison error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Model analysis endpoint
app.post('/api/analyze-model', async (req, res) => {
  try {
    const { modelId, taskType = 'text-classification' } = req.body;
    
    if (!modelId) {
      return res.status(400).json({ 
        success: false, 
        error: 'modelId is required' 
      });
    }

    const { default: ModelAnalyzer } = await import('./model-analyzer.js');
    const analyzer = new ModelAnalyzer();
    
    const analysis = await analyzer.getEvaluationPlan(modelId, taskType);
    
    res.json({
      success: true,
      modelId,
      analysis,
      usesMockData: analysis.type === 'mock',
      reason: analysis.reason,
      hardwareRequirements: analysis.hardwareRequirements
    });
  } catch (error) {
    console.error('Model analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Quick accuracy check (for extension integration)
app.post('/api/quick-accuracy', async (req, res) => {
  try {
    const { modelId, taskType = 'text-classification', sampleText } = req.body;
    
    if (!modelId) {
      return res.status(400).json({ 
        success: false, 
        error: 'modelId is required' 
      });
    }

    console.log(`[API] Quick accuracy check: ${modelId}`);
    
    const { default: HybridEvaluationService } = await import('./hybrid-evaluation-service.js');
    const hybridService = new HybridEvaluationService();
    
    // Quick evaluation with minimal samples
    const result = await hybridService.evaluateModel(modelId, taskType);
    
    // Format for extension display
    const quickResult = {
      modelId,
      modelName: result.modelName,
      accuracy: {
        percentage: `${((result.metrics?.accuracy || result.aggregatedMetrics?.mean?.accuracy || 0) * 100).toFixed(1)}%`,
        raw: result.metrics?.accuracy || result.aggregatedMetrics?.mean?.accuracy || 0
      },
      performance: result.performanceAssessment?.level || 'unknown',
      evaluationType: result.metadata?.evaluationType || 'unknown',
      isMock: result.status === 'completed_mock',
      readyForProduction: result.summary?.readyForProduction || false,
      recommendation: result.summary?.recommendation || 'No recommendation available',
      evaluatedAt: result.evaluatedAt
    };
    
    res.json({
      success: true,
      result: quickResult,
      details: result
    });
  } catch (error) {
    console.error('Quick accuracy error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Hybrid model comparison (for comparing multiple models)
app.post('/api/hybrid-compare', async (req, res) => {
  try {
    const { models, taskType = 'text-classification' } = req.body;
    
    if (!models || !Array.isArray(models) || models.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'models array is required' 
      });
    }

    console.log(`[API] Hybrid comparison for models: ${models.join(', ')}`);
    
    const { default: HybridEvaluationService } = await import('./hybrid-evaluation-service.js');
    const hybridService = new HybridEvaluationService();
    
    // Evaluate all models
    const results = [];
    for (const modelId of models) {
      try {
        const result = await hybridService.evaluateModel(modelId, taskType);
        results.push({
          modelId,
          success: true,
          result: {
            modelId,
            modelName: result.modelName || modelId.split('/').pop(),
            accuracy: {
              percentage: `${(result.aggregatedMetrics?.mean?.accuracy * 100 || result.metrics?.accuracy * 100 || 0).toFixed(1)}%`,
              raw: result.aggregatedMetrics?.mean?.accuracy || result.metrics?.accuracy || 0
            },
            performance: result.performanceAssessment?.level || 'unknown',
            evaluationType: result.metadata?.isMock ? 'mock' : 'real',
            isMock: result.metadata?.isMock || false,
            readyForProduction: result.performanceAssessment?.meetsStandard || false,
            recommendation: result.summary?.recommendation || 'No recommendation available',
            evaluatedAt: result.evaluatedAt
          },
          details: result
        });
      } catch (error) {
        console.error(`Error evaluating ${modelId}:`, error);
        results.push({
          modelId,
          success: false,
          error: error.message
        });
      }
    }
    
    // Create leaderboard
    const successfulResults = results.filter(r => r.success);
    const leaderboard = successfulResults
      .sort((a, b) => b.result.accuracy.raw - a.result.accuracy.raw)
      .map((r, index) => ({
        rank: index + 1,
        modelId: r.modelId,
        modelName: r.result.modelName,
        accuracy: r.result.accuracy.percentage,
        performance: r.result.performance,
        evaluationType: r.result.evaluationType,
        isMock: r.result.isMock
      }));
    
    res.json({
      success: true,
      results,
      leaderboard,
      summary: {
        totalModels: models.length,
        successfulEvaluations: successfulResults.length,
        failedEvaluations: results.length - successfulResults.length,
        topModel: leaderboard[0] || null
      }
    });
  } catch (error) {
    console.error('Hybrid comparison error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Run comprehensive benchmark
app.post('/benchmark/run', async (req, res) => {
  try {
    const { taskType = 'text-classification', modelName = 'mock-local-model' } = req.body;
    
    console.log(`[API] Starting comprehensive benchmark for ${taskType}...`);
    
    // Import BenchmarkService dynamically to avoid circular imports
    const { BenchmarkService } = await import('./benchmark-service.js');
    const benchmarkService = new BenchmarkService();
    
    const benchmarkResult = await benchmarkService.runComprehensiveBenchmark(taskType, modelName);
    
    // Store benchmark results
    await storeAutomatedEvaluationResults({
      ...benchmarkResult,
      type: 'benchmark',
      modelId: modelName,
      triggeredBy: 'api'
    });
    
    res.json({
      success: true,
      benchmark: benchmarkResult,
      message: 'Comprehensive benchmark completed successfully'
    });
  } catch (error) {
    console.error('[API] Benchmark failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get benchmark history
app.get('/benchmark/history', async (req, res) => {
  try {
    const { BenchmarkService } = await import('./benchmark-service.js');
    const benchmarkService = new BenchmarkService();
    
    const history = benchmarkService.getBenchmarkHistory();
    
    res.json({
      success: true,
      benchmarks: history,
      count: history.length
    });
  } catch (error) {
    console.error('[API] Failed to get benchmark history:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get specific benchmark by ID
app.get('/benchmark/:benchmarkId', async (req, res) => {
  try {
    const { benchmarkId } = req.params;
    
    const { BenchmarkService } = await import('./benchmark-service.js');
    const benchmarkService = new BenchmarkService();
    
    const benchmark = benchmarkService.getBenchmarkById(benchmarkId);
    
    if (!benchmark) {
      return res.status(404).json({ 
        success: false, 
        error: 'Benchmark not found' 
      });
    }
    
    res.json({
      success: true,
      benchmark
    });
  } catch (error) {
    console.error('[API] Failed to get benchmark:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Export benchmark results
app.get('/benchmark/:benchmarkId/export/:format', async (req, res) => {
  try {
    const { benchmarkId, format } = req.params;
    
    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Format must be json or csv' 
      });
    }
    
    const { BenchmarkService } = await import('./benchmark-service.js');
    const benchmarkService = new BenchmarkService();
    
    const exportData = benchmarkService.exportResults(benchmarkId, format);
    
    if (!exportData) {
      return res.status(404).json({ 
        success: false, 
        error: 'Benchmark not found' 
      });
    }
    
    const contentType = format === 'json' ? 'application/json' : 'text/csv';
    const fileName = `benchmark_${benchmarkId}.${format}`;
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(exportData);
  } catch (error) {
    console.error('[API] Failed to export benchmark:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Clear model cache
app.post('/cache/clear', async (req, res) => {
  try {
    evaluationScheduler.clearModelCache();
    res.json({ success: true, message: 'Model cache cleared' });
  } catch (error) {
    console.error('[API] Failed to clear cache:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===========================================
// END AUTOMATED EVALUATION ENDPOINTS
// ===========================================

// Endpoint for AI agent recommendations
app.post('/ai-recommendations', async (req, res) => {
  try {
    const { query, taskType } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: 'Query is required' 
      });
    }
    
    // Extract task type from query if not provided
    let detectedTaskType = taskType;
    if (!detectedTaskType) {
      detectedTaskType = detectTaskTypeFromQuery(query);
    }
    
    const recommendations = await getModelRecommendations(detectedTaskType, query);
    
    res.json({
      success: true,
      query: query,
      detectedTaskType: detectedTaskType,
      recommendations: recommendations,
      response: generateAIResponse(query, recommendations, detectedTaskType)
    });
  } catch (error) {
    console.error('[API] Failed to get AI recommendations:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Endpoint for BERTScore evaluation
app.post('/bertscore', async (req, res) => {
  try {
    const { candidate, reference } = req.body;
    
    if (!candidate || !reference) {
      return res.status(400).json({ 
        success: false, 
        error: 'candidate and reference are required' 
      });
    }
    
    console.log(`[API] Computing BERTScore for candidate vs reference`);
    
    const bertResult = await bertScoreClient.calculate(candidate, reference);
    
    res.json({
      success: true,
      candidate: candidate,
      reference: reference,
      bertscore: bertResult
    });
  } catch (error) {
    console.error('[API] BERTScore calculation failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Helper functions
function detectTaskTypeFromQuery(query) {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('sentiment') || queryLower.includes('classification') || queryLower.includes('categorize')) {
    return 'text-classification';
  }
  if (queryLower.includes('generate') || queryLower.includes('writing') || queryLower.includes('text generation')) {
    return 'text-generation';
  }
  if (queryLower.includes('question') || queryLower.includes('answer') || queryLower.includes('qa')) {
    return 'question-answering';
  }
  if (queryLower.includes('image') || queryLower.includes('picture') || queryLower.includes('photo')) {
    return 'image-classification';
  }
  
  // Default to text classification
  return 'text-classification';
}

function generateAIResponse(query, recommendations, taskType) {
  const taskDescriptions = {
    'text-classification': 'text classification and sentiment analysis',
    'text-generation': 'text generation and creative writing',
    'question-answering': 'question answering and information retrieval',
    'image-classification': 'image classification and computer vision'
  };
  
  const taskDesc = taskDescriptions[taskType] || taskType;
  
  if (recommendations.length === 0) {
    return `I couldn't find any evaluated models for ${taskDesc}. You might want to trigger an evaluation first.`;
  }
  
  let response = `Based on your query about ${taskDesc}, here are the top ${recommendations.length} highest accuracy models:\n\n`;
  
  recommendations.forEach((model, index) => {
    response += `${index + 1}. **${model.modelId}**\n`;
    response += `   - Accuracy: ${model.accuracy}%\n`;
    response += `   - Samples tested: ${model.samplesTested}\n`;
    response += `   - Last evaluated: ${new Date(model.evaluatedAt).toLocaleDateString()}\n\n`;
  });
  
  response += `These models have been evaluated using standardized test datasets and ranked by accuracy. Choose the one that best fits your specific use case!`;
  
  return response;
}

// Existing endpoints continue below...

// Contract configuration
const CONTRACT_ADDRESS = "0x8a446886a44743e78138a27f359873fe86613dfe";
const FUJI_RPC = process.env.FUJI_RPC || "https://api.avax-test.network/ext/bc/C/rpc";

// Contract ABI for hybrid system
const CONTRACT_ABI = [
  "function getModelStats(string memory modelSlug) public view returns (uint256 trustScore, uint256 totalRatings, uint256 activeRatings, uint256 averageScore, uint256 totalStaked)",
  "function getModelRatings(string memory modelSlug) public view returns (tuple(address user, uint8 score, bytes32 metadataHash, uint256 stake, uint256 timestamp, bool slashed, uint256 weight)[] memory)",
  "function submitRating(string memory modelSlug, uint8 score, bytes32 metadataHash) public payable",
  "function updateRating(string memory modelSlug, uint8 newScore, bytes32 newMetadataHash) public payable"
];

// Initialize provider and contract
const provider = new ethers.JsonRpcProvider(FUJI_RPC);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

const PORT = 5000;

// Helper function to generate metadata hash
function generateMetadataHash(metadata) {
  const metadataString = JSON.stringify(metadata, Object.keys(metadata).sort());
  return crypto.createHash('sha256').update(metadataString).digest('hex');
}

async function startServer() {
  // Connect to MongoDB
  await connectDB();

  // Mount agent routes
  app.use('/api/agent', agentRoutes);
  console.log('[Server] Agent API routes mounted at /api/agent');

  // Mount crawl agent routes
  app.use('/api/crawl', crawlRoutes);
  console.log('[Server] Crawl Agent API routes mounted at /api/crawl');

  // Health route
  app.get("/health", (req, res) => {
    res.json({ ok: true, contract: CONTRACT_ADDRESS, rpc: FUJI_RPC });
  });

  // Test route
  app.get("/test", async (req, res) => {
    const db = client.db("stakingDB");
    const stakes = db.collection("stakes");
    const data = await stakes.find().toArray();
    res.json(data);
  });

  // Store rating metadata off-chain and return hash
  app.post("/api/rating/metadata", async (req, res) => {
    try {
      const { modelSlug, comment, userProfile, context } = req.body;
      
      const metadata = {
        modelSlug,
        comment,
        userProfile,
        context,
        timestamp: Date.now(),
        version: "1.0"
      };
      
      // Generate hash for on-chain storage
      const metadataHash = generateMetadataHash(metadata);
      
      // Store in MongoDB
      const db = client.db("stakingDB");
      const ratings = db.collection("ratingMetadata");
      
      await ratings.insertOne({
        metadataHash,
        metadata,
        createdAt: new Date()
      });
      
      console.log(`📝 Stored metadata for hash: ${metadataHash}`);
      res.json({ 
        success: true, 
        metadataHash: `0x${metadataHash}`,
        metadata 
      });
    } catch (error) {
      console.error("❌ Error storing metadata:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get rating metadata by hash
  app.get("/api/rating/metadata/:hash", async (req, res) => {
    try {
      const { hash } = req.params;
      const cleanHash = hash.startsWith('0x') ? hash.slice(2) : hash;
      
      const db = client.db("stakingDB");
      const ratings = db.collection("ratingMetadata");
      
      const result = await ratings.findOne({ metadataHash: cleanHash });
      
      if (!result) {
        return res.status(404).json({ error: "Metadata not found" });
        }
      
      res.json(result.metadata);
    } catch (error) {
      console.error("❌ Error fetching metadata:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get model stats from blockchain
  app.get("/api/model/:modelSlug/stats", async (req, res) => {
    try {
      const { modelSlug } = req.params;
      console.log(`📊 Fetching stats for model: ${modelSlug}`);
      
      const stats = await contract.getModelStats(modelSlug);
      
      const formattedStats = {
        trustScore: Number(stats.trustScore),
        totalRatings: Number(stats.totalRatings),
        activeRatings: Number(stats.activeRatings),
        averageScore: Number(stats.averageScore),
        totalStaked: ethers.formatEther(stats.totalStaked)
      };
      
      console.log(`✅ Stats for ${modelSlug}:`, formattedStats);
      res.json(formattedStats);
    } catch (error) {
      console.error(`❌ Error fetching stats for ${req.params.modelSlug}:`, error);
      res.status(500).json({ error: error.shortMessage || error.message });
    }
  });

  // NEW: Query-based stats endpoint to support slugs with '/'
  app.get("/api/model/stats", async (req, res) => {
    try {
      const modelSlug = req.query.slug;
      if (!modelSlug) return res.status(400).json({ error: "Missing slug query param" });
      console.log(`📊 Fetching stats (query) for model: ${modelSlug}`);

      const stats = await contract.getModelStats(modelSlug);

      const formattedStats = {
        trustScore: Number(stats.trustScore),
        totalRatings: Number(stats.totalRatings),
        activeRatings: Number(stats.activeRatings),
        averageScore: Number(stats.averageScore),
        totalStaked: ethers.formatEther(stats.totalStaked)
      };

      res.json(formattedStats);
    } catch (error) {
      console.error(`❌ Error fetching stats (query):`, error);
      res.status(500).json({ error: error.shortMessage || error.message });
    }
  });

  // NEW: Trust Score API that combines benchmark (60%) and user ratings (40%)
  app.get("/api/trust-score", async (req, res) => {
    try {
      const modelSlug = req.query.slug;
      if (!modelSlug) return res.status(400).json({ error: "Missing slug query param" });
      
      console.log(`🎯 Calculating combined trust score for model: ${modelSlug}`);

      // Get user ratings from blockchain
      const stats = await contract.getModelStats(modelSlug);
      const userRatingScore = Number(stats.trustScore); // 0-100 scale
      const totalRatings = Number(stats.totalRatings);
      
      // Get benchmark score (mock for now - you can integrate real benchmark data)
      let benchmarkScore = 75; // Default benchmark score
      
      // Try to get actual benchmark data if available
      try {
        // You can replace this with actual benchmark service call
        // const benchmarkData = await benchmarkService.getModelBenchmark(modelSlug);
        // benchmarkScore = benchmarkData.overallScore;
        
        // For now, use some logic based on model name to simulate benchmark scores
        const lowerSlug = modelSlug.toLowerCase();
        if (lowerSlug.includes('gpt-4') || lowerSlug.includes('claude-3')) {
          benchmarkScore = 85;
        } else if (lowerSlug.includes('gpt-3.5') || lowerSlug.includes('gemini')) {
          benchmarkScore = 80;
        } else if (lowerSlug.includes('llama') || lowerSlug.includes('mistral')) {
          benchmarkScore = 78;
        } else if (lowerSlug.includes('phi') || lowerSlug.includes('qwen')) {
          benchmarkScore = 72;
        }
      } catch (error) {
        console.log('Could not fetch benchmark data, using default');
      }
      
      // Calculate combined trust score: 60% benchmark + 40% user ratings
      let combinedTrustScore;
      if (totalRatings === 0) {
        // If no user ratings, use 100% benchmark score but cap at 60
        combinedTrustScore = Math.min(benchmarkScore * 0.6, 60);
      } else {
        // Combine: 60% benchmark + 40% user ratings
        combinedTrustScore = Math.round((benchmarkScore * 0.6) + (userRatingScore * 0.4));
      }
      
      // Ensure score is within 0-100 range
      combinedTrustScore = Math.max(0, Math.min(100, combinedTrustScore));
      
      console.log(`✅ Trust score calculation for ${modelSlug}:`);
      console.log(`   - Benchmark score: ${benchmarkScore}/100 (60% weight)`);
      console.log(`   - User rating score: ${userRatingScore}/100 (40% weight)`);
      console.log(`   - Combined trust score: ${combinedTrustScore}/100`);
      console.log(`   - Total user ratings: ${totalRatings}`);
      
      res.json({
        trustScore: combinedTrustScore,
        totalRatings: totalRatings,
        benchmarkScore: benchmarkScore,
        userRatingScore: userRatingScore,
        breakdown: {
          benchmarkContribution: Math.round(benchmarkScore * 0.6),
          userRatingContribution: Math.round(userRatingScore * 0.4)
        }
      });
      
    } catch (error) {
      console.error(`❌ Error calculating trust score:`, error);
      res.status(500).json({ error: error.shortMessage || error.message });
    }
  });

  // Get model ratings with hybrid data (on-chain + off-chain)
  app.get("/api/model/:modelSlug/ratings", async (req, res) => {
    try {
      const { modelSlug } = req.params;
      console.log(`⭐ Fetching hybrid ratings for model: ${modelSlug}`);
      
      // Get on-chain data
      const onChainRatings = await contract.getModelRatings(modelSlug);
      
      // Get off-chain metadata for each rating
      const db = client.db("stakingDB");
      const ratings = db.collection("ratingMetadata");
      
      const hybridRatings = await Promise.all(
        onChainRatings.map(async (rating) => {
          const metadataHash = rating.metadataHash;
          const cleanHash = typeof metadataHash === 'string' && metadataHash.startsWith('0x') ? metadataHash.slice(2) : (ethers.hexlify(metadataHash).slice(2));
          
          // Fetch off-chain metadata
          const metadataDoc = await ratings.findOne({ metadataHash: cleanHash });
          
          return {
            // On-chain data
            user: rating.user,
            score: Number(rating.score),
            stake: rating.stake.toString(),
            stakeFormatted: ethers.formatEther(rating.stake),
            timestamp: rating.timestamp.toString(),
            slashed: rating.slashed,
            weight: rating.weight.toString(),
            metadataHash: ethers.hexlify(metadataHash),
            
            // Off-chain data
            comment: metadataDoc?.metadata?.comment || "No comment available",
            userProfile: metadataDoc?.metadata?.userProfile || {},
            context: metadataDoc?.metadata?.context || {}
          };
        })
      );
      
      console.log(`✅ Found ${hybridRatings.length} hybrid ratings for ${modelSlug}`);
      res.json(hybridRatings);
    } catch (error) {
      console.error(`❌ Error fetching hybrid ratings for ${req.params.modelSlug}:`, error);
      res.status(500).json({ error: error.shortMessage || error.message });
    }
  });

  // NEW: Query-based ratings endpoint to support slugs with '/'
  app.get("/api/model/ratings", async (req, res) => {
    try {
      const modelSlug = req.query.slug;
      if (!modelSlug) return res.status(400).json({ error: "Missing slug query param" });
      console.log(`⭐ Fetching hybrid ratings (query) for model: ${modelSlug}`);

      const onChainRatings = await contract.getModelRatings(modelSlug);

      const db = client.db("stakingDB");
      const ratings = db.collection("ratingMetadata");

      const hybridRatings = await Promise.all(
        onChainRatings.map(async (rating) => {
          const metadataHash = rating.metadataHash;
          const cleanHash = typeof metadataHash === 'string' && metadataHash.startsWith('0x') ? metadataHash.slice(2) : (ethers.hexlify(metadataHash).slice(2));

          const metadataDoc = await ratings.findOne({ metadataHash: cleanHash });

          return {
            user: rating.user,
            score: Number(rating.score),
            stake: rating.stake.toString(),
            stakeFormatted: ethers.formatEther(rating.stake),
            timestamp: rating.timestamp.toString(),
            slashed: rating.slashed,
            weight: rating.weight.toString(),
            metadataHash: ethers.hexlify(metadataHash),
            comment: metadataDoc?.metadata?.comment || "No comment available",
            userProfile: metadataDoc?.metadata?.userProfile || {},
            context: metadataDoc?.metadata?.context || {}
          };
        })
      );

      res.json(hybridRatings);
    } catch (error) {
      console.error(`❌ Error fetching hybrid ratings (query):`, error);
      res.status(500).json({ error: error.shortMessage || error.message });
    }
  });

  // Initialize VeriAI Agent
  const veriAIAgent = new VeriAIAgent();

  // VeriAI Model Cache and Agent Endpoints
  
  // Get all models from cache
  app.get('/api/models', async (req, res) => {
    try {
      const { category, search, limit } = req.query;
      let models = Object.values(TOP_50_MODELS);
      
      if (category) {
        models = models.filter(model => model.category === category);
      }
      
      if (search) {
        models = searchModels(search, category);
      }
      
      if (limit) {
        models = models.slice(0, parseInt(limit));
      }
      
      res.json({ models, total: models.length });
    } catch (error) {
      console.error('❌ Error fetching models:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get specific model by ID
  app.get('/api/models/:modelId', async (req, res) => {
    try {
      const { modelId } = req.params;
      const model = getModelById(modelId);
      
      if (!model) {
        return res.status(404).json({ error: 'Model not found' });
      }
      
      res.json({ model });
    } catch (error) {
      console.error('❌ Error fetching model:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get model recommendations
  app.get('/api/models/recommend/:useCase', async (req, res) => {
    try {
      const { useCase } = req.params;
      const { budget, speed, limit = 5 } = req.query;
      
      const recommendations = getCacheModelRecommendations(
        useCase, 
        budget ? parseFloat(budget) : null,
        speed ? parseInt(speed) : null
      );
      
      res.json({ 
        useCase,
        recommendations: recommendations.slice(0, parseInt(limit)),
        total: recommendations.length 
      });
    } catch (error) {
      console.error('❌ Error getting recommendations:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // VeriAI Agent Chat endpoint
  app.post('/api/agent/chat', async (req, res) => {
    try {
      const { message, conversationHistory = [] } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      const result = await veriAIAgent.processQuery(message, conversationHistory);
      
      res.json({
        response: result.response,
        isRedirect: result.isRedirect || false,
        modelData: result.modelData || null,
        queryAnalysis: result.queryAnalysis || null,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error processing agent query:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get top models by accuracy
  app.get('/api/models/top/accuracy', async (req, res) => {
    try {
      const { category, limit = 10 } = req.query;
      const topModels = getTopModelsByAccuracy(parseInt(limit), category);
      
      res.json({ 
        models: topModels,
        category: category || 'all',
        total: topModels.length 
      });
    } catch (error) {
      console.error('❌ Error fetching top models:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Model comparison endpoint
  app.post('/api/models/compare', async (req, res) => {
    try {
      const { modelIds } = req.body;
      
      if (!Array.isArray(modelIds) || modelIds.length < 2) {
        return res.status(400).json({ error: 'At least 2 model IDs required for comparison' });
      }
      
      const models = modelIds.map(id => getModelById(id)).filter(Boolean);
      
      if (models.length !== modelIds.length) {
        return res.status(404).json({ error: 'One or more models not found' });
      }
      
      const comparison = {
        models,
        comparison: {
          accuracy: models.map(m => ({ id: m.id, name: m.name, value: m.accuracy })),
          cost: models.map(m => ({ id: m.id, name: m.name, value: m.cost_per_1k_tokens })),
          speed: models.map(m => ({ id: m.id, name: m.name, value: m.speed_tokens_per_sec })),
          best_accuracy: models.reduce((best, current) => current.accuracy > best.accuracy ? current : best),
          most_cost_effective: models.reduce((best, current) => current.cost_per_1k_tokens < best.cost_per_1k_tokens ? current : best),
          fastest: models.reduce((best, current) => current.speed_tokens_per_sec > best.speed_tokens_per_sec ? current : best)
        }
      };
      
      res.json(comparison);
    } catch (error) {
      console.error('❌ Error comparing models:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Contract: ${CONTRACT_ADDRESS}`);
    console.log(`🌐 RPC: ${FUJI_RPC}`);
    console.log(`🔄 Hybrid system: On-chain + Off-chain metadata`);
    console.log(`🤖 VeriAI Agent: Model intelligence ready`);
    console.log(`📊 Model Cache: ${Object.keys(TOP_50_MODELS).length} models loaded`);
  });
}
app.post("/stake", async (req, res) => {
  try {
    const db = client.db("stakingDB");
    const stakes = db.collection("stakes");

    const newStake = req.body; // { user: "Avinash", amount: 100 }
    const result = await stakes.insertOne(newStake);

    res.json({ success: true, id: result.insertedId });
  } catch (err) {
    console.error("Error inserting stake:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// AUTOMATION API ENDPOINTS
// ==========================================

// Trigger manual evaluation with hybrid system
app.post('/api/automation/evaluate', async (req, res) => {
  try {
    const { modelId, taskType = 'text-classification', forceEvaluation = false } = req.body;
    
    if (!modelId) {
      return res.status(400).json({ 
        success: false, 
        error: 'modelId is required' 
      });
    }

    console.log(`[API] Manual hybrid evaluation triggered: ${modelId}`);
    
    const { default: HybridEvaluationService } = await import('./hybrid-evaluation-service.js');
    const hybridService = new HybridEvaluationService();
    
    const result = await hybridService.evaluateModel(modelId, taskType);
    
    // Store in database
    await storeAutomatedEvaluationResults(result);
    
    const evaluationType = result.metadata?.isMock ? 'mock' : 'real';
    const accuracy = result.aggregatedMetrics?.mean?.accuracy || result.metrics?.accuracy || 0;
    
    res.json({
      success: true,
      evaluation: {
        modelId,
        evaluationType,
        accuracy: `${(accuracy * 100).toFixed(1)}%`,
        recommendation: result.summary?.recommendation || 'No recommendation available',
        readyForProduction: result.performanceAssessment?.meetsStandard || false,
        evaluatedAt: result.evaluatedAt
      },
      details: result
    });
  } catch (error) {
    console.error('[API] Manual evaluation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get automation status and recent evaluations
app.get('/api/automation/status', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get recent evaluations from database
    const recentEvaluations = await getRecentEvaluationResults(parseInt(limit));
    
    // Separate real vs mock evaluations
    const realEvaluations = recentEvaluations.filter(e => !e.metadata?.isMock);
    const mockEvaluations = recentEvaluations.filter(e => e.metadata?.isMock);
    
    res.json({
      success: true,
      status: {
        totalEvaluations: recentEvaluations.length,
        realEvaluations: realEvaluations.length,
        mockEvaluations: mockEvaluations.length,
        lastEvaluationAt: recentEvaluations[0]?.evaluatedAt || null
      },
      recentEvaluations: recentEvaluations.map(evaluation => ({
        modelId: evaluation.modelId,
        evaluationType: evaluation.metadata?.isMock ? 'mock' : 'real',
        accuracy: evaluation.aggregatedMetrics?.mean?.accuracy || evaluation.metrics?.accuracy || evaluation.accuracy || 0,
        performance: evaluation.performanceAssessment?.level || 'unknown',
        evaluatedAt: evaluation.evaluatedAt,
        status: evaluation.status || 'completed'
      }))
    });
  } catch (error) {
    console.error('[API] Failed to get automation status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Bulk evaluate multiple models with hybrid system
app.post('/api/automation/bulk-evaluate', async (req, res) => {
  try {
    const { models, taskType = 'text-classification' } = req.body;
    
    if (!models || !Array.isArray(models) || models.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'models array is required' 
      });
    }

    console.log(`[API] Bulk hybrid evaluation triggered for ${models.length} models`);
    
    const { default: HybridEvaluationService } = await import('./hybrid-evaluation-service.js');
    const hybridService = new HybridEvaluationService();
    
    const results = [];
    
    for (const modelId of models) {
      try {
        console.log(`[API] Evaluating ${modelId}...`);
        const result = await hybridService.evaluateModel(modelId, taskType);
        
        // Store in database
        await storeAutomatedEvaluationResults(result);
        
        const evaluationType = result.metadata?.isMock ? 'mock' : 'real';
        const accuracy = result.aggregatedMetrics?.mean?.accuracy || result.metrics?.accuracy || 0;
        
        results.push({
          modelId,
          success: true,
          evaluationType,
          accuracy: `${(accuracy * 100).toFixed(1)}%`,
          performance: result.performanceAssessment?.level || 'unknown',
          readyForProduction: result.performanceAssessment?.meetsStandard || false,
          evaluatedAt: result.evaluatedAt
        });
        
        console.log(`[API] ✅ ${evaluationType.toUpperCase()} evaluation completed: ${modelId} - ${(accuracy * 100).toFixed(1)}%`);
      } catch (error) {
        console.error(`[API] Failed to evaluate ${modelId}:`, error);
        results.push({
          modelId,
          success: false,
          error: error.message
        });
      }
    }
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    res.json({
      success: true,
      summary: {
        totalModels: models.length,
        successful: successful.length,
        failed: failed.length,
        realEvaluations: successful.filter(r => r.evaluationType === 'real').length,
        mockEvaluations: successful.filter(r => r.evaluationType === 'mock').length
      },
      results
    });
  } catch (error) {
    console.error('[API] Bulk evaluation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Model comparison endpoint using Gemini AI
app.post('/api/models/compare-outputs', async (req, res) => {
  try {
    const { models, prompt } = req.body;
    
    if (!models || !Array.isArray(models) || models.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 models are required for comparison'
      });
    }
    
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Test prompt is required'
      });
    }

    console.log(`[API] Starting model comparison for ${models.length} models`);
    
    // Mock outputs for now - in production this would call the actual APIs
    const modelOutputs = await Promise.all(models.map(async (model, index) => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      
      // Generate mock responses that vary based on model name
      const responses = {
        'gpt-4': `GPT-4 Response: ${prompt}\n\nAs an advanced language model, I can provide a comprehensive analysis of this topic. The key aspects to consider are the technical foundations, practical applications, and future implications. This technology represents a significant advancement in the field and has broad applications across various industries.`,
        'claude-3-sonnet': `Claude 3 Sonnet Response: ${prompt}\n\nI'd be happy to explain this topic thoughtfully. From my understanding, this involves several interconnected concepts that are worth exploring systematically. The fundamental principles underlying this are well-established, and there are several practical considerations to keep in mind when applying these concepts.`,
        'gemini-pro': `Gemini Pro Response: ${prompt}\n\nLet me break this down for you in a clear and structured way. This is an important topic that benefits from a methodical approach. The core concepts can be understood through examining the underlying mechanisms and their real-world applications.`,
        'llama-2-70b': `Llama 2 70B Response: ${prompt}\n\nBased on my training, I can offer insights into this subject. The topic encompasses multiple dimensions that are worth considering. From a technical perspective, the implementation involves several key components that work together to achieve the desired outcomes.`
      };
      
      const modelKey = Object.keys(responses).find(key => 
        model.name.toLowerCase().includes(key.replace('-', '').replace(/\d+/g, ''))
      );
      
      return {
        modelName: model.name,
        output: responses[modelKey] || `${model.name} Response: ${prompt}\n\nThis is a well-structured response that addresses the core aspects of your question. The topic involves several key considerations and practical applications that are worth exploring further.`
      };
    }));

    // Calculate quality metrics using Gemini AI analysis
    const results = await Promise.all(modelOutputs.map(async (output) => {
      // Mock quality analysis - in production this would use Gemini API
      const baseScores = {
        fluency: 75 + Math.random() * 20,
        coherence: 70 + Math.random() * 25,
        safety: 85 + Math.random() * 15,
        confidence: 65 + Math.random() * 30
      };
      
      // Adjust scores based on model name (simulating different model capabilities)
      const adjustments = {
        'gpt-4': { fluency: 10, coherence: 15, confidence: 10 },
        'claude': { fluency: 8, coherence: 12, safety: 5 },
        'gemini': { fluency: 6, coherence: 8, confidence: 5 },
        'llama': { fluency: -5, coherence: -3, confidence: -8 }
      };
      
      let adjustedScores = { ...baseScores };
      Object.keys(adjustments).forEach(key => {
        if (output.modelName.toLowerCase().includes(key)) {
          Object.keys(adjustments[key]).forEach(metric => {
            adjustedScores[metric] = Math.min(100, Math.max(0, 
              adjustedScores[metric] + adjustments[key][metric]
            ));
          });
        }
      });
      
      // Round scores to integers
      Object.keys(adjustedScores).forEach(key => {
        adjustedScores[key] = Math.round(adjustedScores[key]);
      });
      
      return {
        modelName: output.modelName,
        output: output.output,
        qualityMetrics: adjustedScores,
        agreementScore: Math.round(70 + Math.random() * 25),
        trustScore: Math.round(65 + Math.random() * 30)
      };
    }));

    // Calculate consensus analysis
    const agreementScores = results.map(r => r.agreementScore);
    const avgAgreement = Math.round(agreementScores.reduce((a, b) => a + b, 0) / agreementScores.length);
    
    // Find outliers (models with significantly different agreement scores)
    const outliers = results.filter(r => 
      Math.abs(r.agreementScore - avgAgreement) > 20
    ).map(r => r.modelName);
    
    // Determine recommendation based on highest combined score
    const combinedScores = results.map(r => ({
      name: r.modelName,
      score: (r.agreementScore + r.trustScore + 
              Object.values(r.qualityMetrics).reduce((a, b) => a + b, 0) / 4) / 3
    }));
    
    const recommended = combinedScores.reduce((max, current) => 
      current.score > max.score ? current : max
    );

    const response = {
      prompt,
      results,
      consensusAnalysis: {
        agreement: avgAgreement,
        outliers,
        recommendation: recommended.name
      }
    };

    console.log(`[API] Model comparison completed successfully`);
    res.json(response);

  } catch (error) {
    console.error('[API] Model comparison failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


startServer().catch(console.error);
