import HybridEvaluationService from './hybrid-evaluation-service.js';
import BenchmarkService from './benchmark-service.js';
import { 
  storeAutomatedEvaluationResults, 
  getCachedEvaluationResults,
  initializeDatabase
} from './database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EvaluationScheduler {
  constructor() {
    this.evaluationService = new HybridEvaluationService();
    this.benchmarkService = new BenchmarkService();
    this.isRunning = false;
    this.scheduledInterval = null;
    this.evaluationQueue = [];
    this.currentEvaluation = null;
  }

  async initialize() {
    try {
      await initializeDatabase();
      console.log('[Scheduler] Database initialized');
      
      // Load models from configuration
      await this.loadModelsFromConfig();
      
      console.log('[Scheduler] Evaluation scheduler initialized');
    } catch (error) {
      console.error('[Scheduler] Failed to initialize:', error);
      throw error;
    }
  }

  async loadModelsFromConfig() {
    try {
      const modelsData = await fs.readFile(path.join(__dirname, 'models.json'), 'utf8');
      const models = JSON.parse(modelsData);
      
      this.evaluationQueue = models.map(model => ({
        modelId: model.id,
        taskType: model.task,
        modelName: model.modelName,
        description: model.description,
        priority: this.getModelPriority(model.id)
      }));
      
      // Sort by priority (higher priority first)
      this.evaluationQueue.sort((a, b) => b.priority - a.priority);
      
      console.log(`[Scheduler] Loaded ${this.evaluationQueue.length} models for evaluation`);
    } catch (error) {
      console.error('[Scheduler] Failed to load models configuration:', error);
      throw error;
    }
  }

  getModelPriority(modelId) {
    // Assign higher priority to smaller/faster models for quicker feedback
    if (modelId.includes('distil')) return 10;
    if (modelId.includes('small') || modelId.includes('base')) return 8;
    if (modelId.includes('deepseek')) return 6; // Important but potentially slower
    if (modelId.includes('large')) return 4;
    return 5; // Default priority
  }

  async evaluateModelWithCache(modelId, taskType, forceEvaluation = false) {
    try {
      // Check if we have cached results (unless forcing)
      if (!forceEvaluation) {
        const cachedResult = await getCachedEvaluationResults(modelId, taskType);
        if (cachedResult) {
          console.log(`[Scheduler] Using cached results for ${modelId}`);
          return cachedResult;
        }
      } else {
        console.log(`[Scheduler] Forcing fresh evaluation for ${modelId}`);
      }

      // No cached results, run evaluation
      console.log(`[Scheduler] Running fresh evaluation for ${modelId}`);
      const evaluationResult = await this.evaluationService.evaluateModel(modelId, taskType);
      
      // Log evaluation type (real vs mock)
      const evaluationType = evaluationResult.metadata?.isMock ? 'mock' : 'real';
      const accuracy = evaluationResult.aggregatedMetrics?.mean?.accuracy || evaluationResult.metrics?.accuracy || 0;
      console.log(`[Scheduler] ✅ ${evaluationType.toUpperCase()} evaluation completed for ${modelId}: ${(accuracy * 100).toFixed(1)}%`);
      
      // Store results in cache
      await storeAutomatedEvaluationResults(evaluationResult);
      
      return evaluationResult;
    } catch (error) {
      console.error(`[Scheduler] Evaluation failed for ${modelId}:`, error.message);
      
      // Store failure result
      const failureResult = {
        modelId,
        taskType,
        evaluatedAt: new Date().toISOString(),
        accuracy: 0,
        samplesTested: 0,
        successfulEvaluations: 0,
        results: [],
        error: error.message,
        status: 'failed'
      };
      
      await storeAutomatedEvaluationResults(failureResult);
      return failureResult;
    }
  }

  async runSingleEvaluation(forceEvaluation = false) {
    if (this.evaluationQueue.length === 0) {
      console.log('[Scheduler] No models in evaluation queue');
      return null;
    }

    if (this.currentEvaluation) {
      console.log('[Scheduler] Evaluation already in progress, skipping');
      return null;
    }

    const modelToEvaluate = this.evaluationQueue.shift();
    this.currentEvaluation = modelToEvaluate;

    console.log(`[Scheduler] Starting evaluation: ${modelToEvaluate.modelId} (${modelToEvaluate.taskType})`);
    
    try {
      const result = await this.evaluateModelWithCache(
        modelToEvaluate.modelId, 
        modelToEvaluate.taskType,
        forceEvaluation
      );
      
      // Enhanced logging with evaluation type
      const evaluationType = result.metadata?.isMock ? 'MOCK' : 'REAL';
      const accuracy = result.aggregatedMetrics?.mean?.accuracy || result.metrics?.accuracy || result.accuracy || 0;
      const accuracyPercentage = typeof accuracy === 'number' ? (accuracy * 100).toFixed(1) : accuracy;
      console.log(`[Scheduler] ✅ Completed ${evaluationType} evaluation: ${modelToEvaluate.modelId} - Accuracy: ${accuracyPercentage}%`);
      
      // Add back to end of queue for next cycle (24 hours later)
      this.evaluationQueue.push(modelToEvaluate);
      
      return result;
    } catch (error) {
      console.error(`[Scheduler] Failed to evaluate ${modelToEvaluate.modelId}:`, error);
      
      // Add back to queue for retry later
      this.evaluationQueue.push(modelToEvaluate);
      
      return null;
    } finally {
      this.currentEvaluation = null;
    }
  }

  async runBatchEvaluation(maxModels = 3, forceEvaluation = false, includeBenchmark = false) {
    console.log(`[Scheduler] Starting batch evaluation (max ${maxModels} models)${forceEvaluation ? ' - FORCED' : ''}${includeBenchmark ? ' with BENCHMARKING' : ''}`);
    
    const results = [];
    let evaluatedCount = 0;

    while (evaluatedCount < maxModels && this.evaluationQueue.length > 0) {
      const result = await this.runSingleEvaluation(forceEvaluation);
      if (result) {
        results.push(result);
        
        // Run comprehensive benchmark for the first model if requested
        if (includeBenchmark && evaluatedCount === 0) {
          console.log(`[Scheduler] Running comprehensive benchmark for ${result.modelId}`);
          try {
            const benchmarkResult = await this.benchmarkService.runComprehensiveBenchmark(
              result.taskType, 
              result.modelId
            );
            
            // Store benchmark results
            await storeAutomatedEvaluationResults({
              ...benchmarkResult,
              type: 'benchmark',
              modelId: result.modelId
            });
            
            result.benchmarkId = benchmarkResult.benchmarkId;
            result.benchmarkSummary = benchmarkResult.summary;
            
            console.log(`[Scheduler] Benchmark completed: ${benchmarkResult.summary.headline}`);
          } catch (error) {
            console.error(`[Scheduler] Benchmark failed for ${result.modelId}:`, error);
          }
        }
        
        evaluatedCount++;
        
        // Small delay between evaluations to prevent system overload
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        break; // Exit if evaluation failed or queue is empty
      }
    }

    console.log(`[Scheduler] Batch evaluation completed: ${evaluatedCount} models evaluated`);
    return results;
  }

  async runScheduledEvaluations() {
    if (this.isRunning) {
      console.log('[Scheduler] Evaluation already running, skipping scheduled run');
      return;
    }

    this.isRunning = true;
    console.log('[Scheduler] Starting scheduled evaluations');

    try {
      // Run comprehensive benchmarking once per day (every 4th run, assuming 6-hour intervals)
      const shouldRunBenchmark = Math.random() < 0.25; // 25% chance, or implement proper daily tracking
      
      // Run a batch of evaluations
      const results = await this.runBatchEvaluation(3, false, shouldRunBenchmark);
      
      console.log(`[Scheduler] Scheduled evaluation completed. ${results.length} models evaluated.`);
      
      // Log summary
      const successful = results.filter(r => r.status === 'completed');
      const failed = results.filter(r => r.status === 'failed');
      const withBenchmarks = results.filter(r => r.benchmarkId);
      
      console.log(`[Scheduler] Summary - Successful: ${successful.length}, Failed: ${failed.length}, Benchmarked: ${withBenchmarks.length}`);
      
      if (successful.length > 0) {
        const avgAccuracy = successful.reduce((sum, r) => sum + r.accuracy, 0) / successful.length;
        console.log(`[Scheduler] Average accuracy: ${avgAccuracy.toFixed(2)}%`);
      }
      
      if (withBenchmarks.length > 0) {
        console.log(`[Scheduler] Benchmark results:`);
        withBenchmarks.forEach(result => {
          console.log(`  ${result.modelId}: ${result.benchmarkSummary.headline} (${result.benchmarkSummary.score})`);
        });
      }
      
    } catch (error) {
      console.error('[Scheduler] Scheduled evaluation failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  startScheduler(intervalHours = 6) {
    if (this.scheduledInterval) {
      console.log('[Scheduler] Scheduler already running');
      return;
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    // Run immediately
    this.runScheduledEvaluations();
    
    // Schedule recurring evaluations
    this.scheduledInterval = setInterval(() => {
      this.runScheduledEvaluations();
    }, intervalMs);
    
    console.log(`[Scheduler] Scheduler started - running every ${intervalHours} hours`);
  }

  stopScheduler() {
    if (this.scheduledInterval) {
      clearInterval(this.scheduledInterval);
      this.scheduledInterval = null;
      console.log('[Scheduler] Scheduler stopped');
    }
  }

  getSchedulerStatus() {
    return {
      isRunning: this.isRunning,
      isScheduled: !!this.scheduledInterval,
      queueLength: this.evaluationQueue.length,
      currentEvaluation: this.currentEvaluation,
      nextModels: this.evaluationQueue.slice(0, 3).map(m => ({
        modelId: m.modelId,
        taskType: m.taskType,
        priority: m.priority
      }))
    };
  }

  async forceEvaluateModel(modelId, taskType) {
    console.log(`[Scheduler] Force evaluating model: ${modelId}`);
    
    // Clear any cached results for this model
    const result = await this.evaluationService.evaluateModel(modelId, taskType);
    await storeAutomatedEvaluationResults(result);
    
    return result;
  }

  async runBenchmarkOnDemand(taskType = 'text-classification', modelName = 'mock-local-model') {
    console.log(`[Scheduler] Running on-demand benchmark for ${taskType}...`);
    
    try {
      const benchmarkResult = await this.benchmarkService.runComprehensiveBenchmark(taskType, modelName);
      
      // Store benchmark results
      await storeAutomatedEvaluationResults({
        ...benchmarkResult,
        type: 'benchmark',
        modelId: modelName,
        triggeredBy: 'manual'
      });
      
      console.log(`[Scheduler] On-demand benchmark completed: ${benchmarkResult.summary.headline}`);
      return benchmarkResult;
      
    } catch (error) {
      console.error(`[Scheduler] On-demand benchmark failed:`, error);
      throw error;
    }
  }

  getBenchmarkHistory() {
    return this.benchmarkService.getBenchmarkHistory();
  }

  getBenchmarkById(benchmarkId) {
    return this.benchmarkService.getBenchmarkById(benchmarkId);
  }

  clearModelCache() {
    this.evaluationService.clearCache();
    console.log('[Scheduler] Model cache cleared');
  }
}

export default EvaluationScheduler;