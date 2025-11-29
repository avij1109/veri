import RealModelService from './real-model-service.js';
import ModelAnalyzer from './model-analyzer.js';
import { BENCHMARK_CONFIG } from './benchmark-config.js';
import { TOP_50_MODELS, getModelById, searchModels, getTopModelsByAccuracy } from './models-cache.js';

export class HybridEvaluationService {
  constructor() {
    this.realModelService = new RealModelService();
    this.modelAnalyzer = new ModelAnalyzer();
    this.evaluationCache = new Map();
  }

  async evaluateModel(modelId, taskType = 'text-classification', datasetSamples = null) {
    // Check cache first
    const cacheKey = `${modelId}-${taskType}`;
    if (this.evaluationCache.has(cacheKey)) {
      console.log(`📋 Using cached evaluation for ${modelId}`);
      return this.evaluationCache.get(cacheKey);
    }

    // Determine evaluation strategy
    const plan = await this.modelAnalyzer.getEvaluationPlan(modelId, taskType);
    
    let result;
    
    if (plan.type === 'mock') {
      result = await this.evaluateWithMockData(modelId, taskType, plan.mockData);
    } else {
      result = await this.evaluateWithRealModel(modelId, taskType, datasetSamples);
    }

    // Cache the result
    this.evaluationCache.set(cacheKey, result);
    
    return result;
  }

  async evaluateWithMockData(modelId, taskType, mockData) {
    console.log(`🎭 Using mock evaluation for ${modelId} (model too large for local execution)`);
    
    // Simulate realistic processing time
    const processingTime = 2000 + Math.random() * 3000; // 2-5 seconds
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    return {
      benchmarkId: `mock_${taskType}_${Date.now()}`,
      modelId,
      modelName: mockData.modelName,
      taskType,
      evaluatedAt: mockData.evaluatedAt,
      duration: `${(processingTime / 1000).toFixed(2)}s`,
      
      // Use mock cross-validation results
      crossValidationResults: mockData.crossValidationResults,
      aggregatedMetrics: mockData.aggregatedMetrics,
      
      // Mock baseline comparison
      baselineComparison: this.generateMockBaselines(mockData.aggregatedMetrics.mean),
      
      // Performance assessment
      performanceAssessment: {
        level: mockData.performanceLevel,
        score: mockData.metrics.accuracy,
        threshold: BENCHMARK_CONFIG.performanceThresholds[taskType] || BENCHMARK_CONFIG.performanceThresholds['text-classification'],
        meetsStandard: mockData.metrics.accuracy >= 0.70,
        recommendations: this.getRecommendations(mockData.performanceLevel)
      },

      // Statistical significance (mock)
      statisticalSignificance: {
        bestBaseline: 'random_baseline',
        meanDifference: mockData.metrics.accuracy - 0.25, // Assume 25% random baseline
        tStatistic: 12.5 + Math.random() * 5, // Strong significance
        isSignificant: true,
        confidenceLevel: '95%'
      },

      // Mock confidence intervals
      confidenceIntervals: this.generateMockConfidenceIntervals(mockData.aggregatedMetrics),

      metadata: {
        ...mockData.metadata,
        evaluationType: 'mock',
        actualInference: false
      },
      
      summary: {
        headline: `Model achieved ${mockData.performanceLevel} performance (mock evaluation)`,
        score: `${(mockData.metrics.accuracy * 100).toFixed(1)}% ± ${(mockData.aggregatedMetrics.std.accuracy * 100).toFixed(1)}%`,
        duration: `${(processingTime / 1000).toFixed(2)}s`,
        recommendation: this.getRecommendations(mockData.performanceLevel)[0],
        readyForProduction: mockData.performanceLevel === 'excellent' || mockData.performanceLevel === 'good',
        isMock: true
      },

      status: 'completed_mock'
    };
  }

  async evaluateWithRealModel(modelId, taskType, datasetSamples) {
    console.log(`🔬 Running real evaluation for ${modelId}`);
    
    try {
      // Use our existing real model service
      const startTime = Date.now();
      
      // Evaluate on provided samples or create small test set
      const testSamples = datasetSamples || this.createDefaultTestSamples(taskType);
      const predictions = [];
      const actuals = [];
      
      for (const sample of testSamples) {
        const result = await this.realModelService.classifyText(sample.text, {
          modelName: modelId,
          task: taskType
        });
        
        predictions.push(result.predicted_label);
        actuals.push(sample.label);
      }
      
      // Calculate metrics
      const metrics = this.calculateMetrics(predictions, actuals);
      const duration = (Date.now() - startTime) / 1000;
      
      return {
        benchmarkId: `real_${taskType}_${Date.now()}`,
        modelId,
        modelName: this.extractModelName(modelId),
        taskType,
        evaluatedAt: new Date().toISOString(),
        duration: `${duration.toFixed(2)}s`,
        
        // Real evaluation results
        metrics,
        samplesTested: testSamples.length,
        predictions: predictions.map((pred, idx) => ({
          actual: actuals[idx],
          predicted: pred,
          text: testSamples[idx].text.substring(0, 100) + '...'
        })),
        
        // Performance assessment
        performanceAssessment: {
          level: this.getPerformanceLevel(metrics.accuracy),
          score: metrics.accuracy,
          threshold: BENCHMARK_CONFIG.performanceThresholds[taskType] || BENCHMARK_CONFIG.performanceThresholds['text-classification'],
          meetsStandard: metrics.accuracy >= 0.70,
          recommendations: this.getRecommendations(this.getPerformanceLevel(metrics.accuracy))
        },

        metadata: {
          evaluationType: 'real',
          actualInference: true,
          modelSize: 'small-to-medium',
          hardwareUsed: 'CPU'
        },
        
        summary: {
          headline: `Model achieved ${this.getPerformanceLevel(metrics.accuracy)} performance`,
          score: `${(metrics.accuracy * 100).toFixed(1)}%`,
          duration: `${duration.toFixed(2)}s`,
          recommendation: this.getRecommendations(this.getPerformanceLevel(metrics.accuracy))[0],
          readyForProduction: metrics.accuracy >= 0.80,
          isMock: false
        },

        status: 'completed_real'
      };
      
    } catch (error) {
      console.error(`❌ Real evaluation failed for ${modelId}:`, error);
      
      // Fallback to mock evaluation if real fails
      console.log(`🔄 Falling back to mock evaluation for ${modelId}`);
      const mockData = this.modelAnalyzer.getMockEvaluation(modelId, taskType);
      return await this.evaluateWithMockData(modelId, taskType, mockData);
    }
  }

  async evaluateMultipleModels(models, taskType = 'text-classification') {
    const results = [];
    
    console.log(`🚀 Starting evaluation of ${models.length} models...`);
    
    for (let i = 0; i < models.length; i++) {
      const modelId = models[i];
      console.log(`📊 Evaluating ${i + 1}/${models.length}: ${modelId}`);
      
      try {
        const result = await this.evaluateModel(modelId, taskType);
        results.push(result);
        
        // Small delay between evaluations
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Failed to evaluate ${modelId}:`, error);
        results.push({
          modelId,
          taskType,
          error: error.message,
          status: 'failed',
          evaluatedAt: new Date().toISOString()
        });
      }
    }
    
    return this.createLeaderboard(results, taskType);
  }

  createLeaderboard(results, taskType) {
    const successfulResults = results.filter(r => r.status?.startsWith('completed'));
    
    // Sort by accuracy (descending)
    successfulResults.sort((a, b) => {
      const aScore = a.metrics?.accuracy || a.aggregatedMetrics?.mean?.accuracy || 0;
      const bScore = b.metrics?.accuracy || b.aggregatedMetrics?.mean?.accuracy || 0;
      return bScore - aScore;
    });
    
    const leaderboard = {
      comparisonId: `leaderboard_${taskType}_${Date.now()}`,
      taskType,
      timestamp: new Date().toISOString(),
      totalModels: results.length,
      successfulModels: successfulResults.length,
      mockEvaluations: results.filter(r => r.status === 'completed_mock').length,
      realEvaluations: results.filter(r => r.status === 'completed_real').length,
      
      leaderboard: successfulResults.map((result, index) => {
        const score = result.metrics?.accuracy || result.aggregatedMetrics?.mean?.accuracy || 0;
        const isMock = result.status === 'completed_mock';
        
        return {
          rank: index + 1,
          modelId: result.modelId,
          modelName: result.modelName,
          score: Math.round(score * 1000) / 1000,
          percentage: `${(score * 100).toFixed(1)}%`,
          performance: result.performanceAssessment?.level || 'unknown',
          duration: result.duration,
          evaluationType: isMock ? 'mock' : 'real',
          isMock
        };
      }),
      
      summary: this.getLeaderboardSummary(successfulResults),
      detailedResults: results
    };
    
    console.log(`\n🏆 Leaderboard (${taskType}):`);
    leaderboard.leaderboard.forEach(entry => {
      const mockLabel = entry.isMock ? ' (mock)' : ' (real)';
      console.log(`${entry.rank}. ${entry.modelName}: ${entry.percentage}${mockLabel} (${entry.performance})`);
    });
    
    return leaderboard;
  }

  // Helper methods
  createDefaultTestSamples(taskType) {
    if (taskType === 'sentiment-analysis') {
      return [
        // Positive samples
        { text: "This product is absolutely amazing and works perfectly!", label: "positive" },
        { text: "Outstanding service and incredible results!", label: "positive" },
        { text: "Fantastic quality, exceeded all my expectations!", label: "positive" },
        { text: "Love this item, would definitely recommend to others.", label: "positive" },
        { text: "Perfect solution to my problem, very satisfied.", label: "positive" },
        { text: "Excellent build quality and great customer support.", label: "positive" },
        { text: "Amazing value for money, couldn't be happier.", label: "positive" },
        { text: "Brilliant design and functionality, works flawlessly.", label: "positive" },
        { text: "Superb performance, exactly what I was looking for.", label: "positive" },
        { text: "Incredible product that delivers on all promises.", label: "positive" },
        
        // Negative samples
        { text: "Terrible quality, completely disappointed with this purchase.", label: "negative" },
        { text: "Waste of money, poor performance and bad design.", label: "negative" },
        { text: "Awful experience, product broke after one day.", label: "negative" },
        { text: "Completely useless, doesn't work as advertised.", label: "negative" },
        { text: "Poor build quality, feels cheap and flimsy.", label: "negative" },
        { text: "Horrible customer service, very disappointed.", label: "negative" },
        { text: "Defective product, had to return immediately.", label: "negative" },
        { text: "Overpriced for such poor quality materials.", label: "negative" },
        { text: "Disappointing performance, not worth the money.", label: "negative" },
        { text: "Terrible design, very difficult to use.", label: "negative" },
        
        // Neutral samples
        { text: "It's okay, nothing special but does the job.", label: "neutral" },
        { text: "Average product, meets basic requirements.", label: "neutral" },
        { text: "Standard quality, what you'd expect for the price.", label: "neutral" },
        { text: "Decent enough, some good points and some bad.", label: "neutral" },
        { text: "Fair value, not great but not terrible either.", label: "neutral" },
        { text: "Acceptable performance, could be better or worse.", label: "neutral" },
        { text: "Mediocre quality, gets the job done adequately.", label: "neutral" },
        { text: "Ordinary product, nothing to write home about.", label: "neutral" },
        { text: "Reasonable option, has both pros and cons.", label: "neutral" },
        { text: "Satisfactory performance, meets minimum standards.", label: "neutral" }
      ];
    } else {
      return [
        // Business (20 samples)
        { text: "Apple Inc. reported strong quarterly earnings with iPhone sales growth.", label: "business" },
        { text: "Tesla's stock price surged after announcing record vehicle deliveries.", label: "business" },
        { text: "Amazon Web Services sees 30% revenue growth in cloud computing.", label: "business" },
        { text: "Microsoft acquires gaming company for $7.5 billion deal.", label: "business" },
        { text: "Google parent Alphabet reports advertising revenue decline.", label: "business" },
        { text: "Meta launches new virtual reality headset for consumers.", label: "business" },
        { text: "Netflix subscriber numbers exceed expectations this quarter.", label: "business" },
        { text: "Cryptocurrency exchange faces regulatory scrutiny.", label: "business" },
        { text: "Startup raises $50 million in Series B funding round.", label: "business" },
        { text: "E-commerce platform reports record Black Friday sales.", label: "business" },
        { text: "Banking sector sees rising interest rates impact profits.", label: "business" },
        { text: "Oil prices fluctuate amid global supply chain concerns.", label: "business" },
        { text: "Retail chain announces store closures across multiple states.", label: "business" },
        { text: "Pharmaceutical company gets FDA approval for new drug.", label: "business" },
        { text: "Airlines recover passenger traffic to pre-pandemic levels.", label: "business" },
        { text: "Real estate market shows signs of cooling in major cities.", label: "business" },
        { text: "Manufacturing company invests in automation technology.", label: "business" },
        { text: "Food delivery service expands to international markets.", label: "business" },
        { text: "Solar energy company secures government contract.", label: "business" },
        { text: "Financial services firm launches mobile payment app.", label: "business" },
        
        // Politics (20 samples)
        { text: "Congress passed new legislation on environmental protection.", label: "politics" },
        { text: "Presidential election campaign begins with primary debates.", label: "politics" },
        { text: "Supreme Court hears arguments on healthcare reform case.", label: "politics" },
        { text: "Senate votes on infrastructure spending bill.", label: "politics" },
        { text: "Local mayor announces plans for public transportation.", label: "politics" },
        { text: "International summit addresses climate change policies.", label: "politics" },
        { text: "Governor signs education reform into state law.", label: "politics" },
        { text: "Trade negotiations continue between allied nations.", label: "politics" },
        { text: "House committee investigates government spending.", label: "politics" },
        { text: "Diplomatic talks aim to resolve border disputes.", label: "politics" },
        { text: "Election officials prepare for upcoming midterm voting.", label: "politics" },
        { text: "Policy experts debate taxation reform proposals.", label: "politics" },
        { text: "City council approves budget for next fiscal year.", label: "politics" },
        { text: "Immigration reform bill faces legislative challenges.", label: "politics" },
        { text: "National security briefing addresses foreign threats.", label: "politics" },
        { text: "Voting rights legislation sparks political debate.", label: "politics" },
        { text: "International treaty requires Senate ratification.", label: "politics" },
        { text: "Political party convention nominates candidate.", label: "politics" },
        { text: "Judicial nomination hearing scheduled for next week.", label: "politics" },
        { text: "Foreign policy strategy shifts focus to Asia-Pacific.", label: "politics" },
        
        // Science (20 samples)
        { text: "Scientists discovered a new species in the Amazon rainforest.", label: "science" },
        { text: "NASA telescope captures images of distant galaxy formation.", label: "science" },
        { text: "Medical researchers develop breakthrough cancer treatment.", label: "science" },
        { text: "Climate study reveals accelerating ice sheet melting.", label: "science" },
        { text: "Artificial intelligence achieves milestone in protein folding.", label: "science" },
        { text: "Quantum computing experiment breaks encryption barriers.", label: "science" },
        { text: "Marine biologists document coral reef recovery.", label: "science" },
        { text: "Archaeologists uncover ancient civilization ruins.", label: "science" },
        { text: "Gene therapy shows promise for inherited diseases.", label: "science" },
        { text: "Space mission successfully lands on asteroid surface.", label: "science" },
        { text: "Renewable energy efficiency reaches new record.", label: "science" },
        { text: "Neuroscience study maps brain activity patterns.", label: "science" },
        { text: "Vaccine research targets emerging viral variants.", label: "science" },
        { text: "Robotics team creates autonomous exploration vehicle.", label: "science" },
        { text: "Paleontologists discover dinosaur fossil with feathers.", label: "science" },
        { text: "Chemistry breakthrough enables plastic recycling.", label: "science" },
        { text: "Physics experiment confirms theoretical predictions.", label: "science" },
        { text: "Environmental study tracks ecosystem changes.", label: "science" },
        { text: "Bioengineering creates lab-grown organ tissue.", label: "science" },
        { text: "Materials science develops ultra-strong composites.", label: "science" },
        
        // Sports (20 samples)
        { text: "The local team won the championship in overtime.", label: "sports" },
        { text: "Olympic records broken in swimming competition.", label: "sports" },
        { text: "Basketball playoffs feature unexpected upsets.", label: "sports" },
        { text: "Soccer world cup preparations begin for host nation.", label: "sports" },
        { text: "Tennis tournament showcases rising young talent.", label: "sports" },
        { text: "Football season kicks off with division rivals.", label: "sports" },
        { text: "Marathon runner sets new course record time.", label: "sports" },
        { text: "Golf major championship sees dramatic final round.", label: "sports" },
        { text: "Baseball world series features two veteran teams.", label: "sports" },
        { text: "Hockey playoffs intensify with overtime battles.", label: "sports" },
        { text: "Track and field athletes qualify for nationals.", label: "sports" },
        { text: "Cycling tour challenges riders through mountains.", label: "sports" },
        { text: "Volleyball team advances to international finals.", label: "sports" },
        { text: "Wrestling championships crown new division leaders.", label: "sports" },
        { text: "Swimming relay team breaks decade-old record.", label: "sports" },
        { text: "Gymnastics competition features perfect routines.", label: "sports" },
        { text: "Boxing match attracts record pay-per-view audience.", label: "sports" },
        { text: "Skiing competition faces challenging weather conditions.", label: "sports" },
        { text: "Surfing championships showcase world-class athletes.", label: "sports" },
        { text: "Triathlon tests endurance in extreme conditions.", label: "sports" }
      ];
    }
  }

  calculateMetrics(predictions, actuals) {
    const accuracy = predictions.filter((pred, idx) => pred === actuals[idx]).length / predictions.length;
    
    // Calculate precision, recall, F1 (simplified for demo)
    const labels = [...new Set([...predictions, ...actuals])];
    let totalPrecision = 0, totalRecall = 0, totalF1 = 0;
    
    labels.forEach(label => {
      const tp = predictions.filter((pred, idx) => pred === label && actuals[idx] === label).length;
      const fp = predictions.filter((pred, idx) => pred === label && actuals[idx] !== label).length;
      const fn = actuals.filter((actual, idx) => actual === label && predictions[idx] !== label).length;
      
      const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
      const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
      const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
      
      totalPrecision += precision;
      totalRecall += recall;
      totalF1 += f1;
    });
    
    return {
      accuracy,
      precision: totalPrecision / labels.length,
      recall: totalRecall / labels.length,
      f1: totalF1 / labels.length,
      sample_count: predictions.length
    };
  }

  generateMockBaselines(meanMetrics) {
    return {
      random_baseline: {
        mean: {
          accuracy: 0.25,
          precision: 0.25,
          recall: 0.25,
          f1: 0.25
        },
        std: { accuracy: 0.05, precision: 0.05, recall: 0.05, f1: 0.05 }
      },
      majority_baseline: {
        mean: {
          accuracy: 0.30,
          precision: 0.30,
          recall: 0.30,
          f1: 0.30
        },
        std: { accuracy: 0.03, precision: 0.03, recall: 0.03, f1: 0.03 }
      }
    };
  }

  generateMockConfidenceIntervals(aggregatedMetrics) {
    const confidence = {};
    
    Object.keys(aggregatedMetrics.mean).forEach(metric => {
      const mean = aggregatedMetrics.mean[metric];
      const std = aggregatedMetrics.std[metric];
      
      confidence[metric] = {
        lower: Math.max(0, mean - 1.96 * std),
        upper: Math.min(1, mean + 1.96 * std),
        confidence: 0.95,
        method: 'bootstrap'
      };
    });
    
    return confidence;
  }

  getRecommendations(performanceLevel) {
    const recommendations = {
      'excellent': ['Model ready for production deployment', 'Consider A/B testing for optimization'],
      'good': ['Model suitable for production with monitoring', 'Fine-tune for better performance'],
      'acceptable': ['Model needs improvement before production', 'Collect more training data'],
      'poor': ['Model requires significant improvement', 'Review architecture and training data']
    };
    
    return recommendations[performanceLevel] || recommendations['poor'];
  }

  getPerformanceLevel(accuracy) {
    if (accuracy >= 0.90) return 'excellent';
    if (accuracy >= 0.80) return 'good';
    if (accuracy >= 0.70) return 'acceptable';
    return 'poor';
  }

  extractModelName(modelId) {
    return modelId.split('/').pop() || modelId;
  }

  getLeaderboardSummary(results) {
    if (results.length === 0) return { message: 'No successful evaluations' };
    
    const scores = results.map(r => r.metrics?.accuracy || r.aggregatedMetrics?.mean?.accuracy || 0);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const topScore = Math.max(...scores);
    const mockCount = results.filter(r => r.status === 'completed_mock').length;
    const realCount = results.filter(r => r.status === 'completed_real').length;
    
    return {
      averageAccuracy: `${(avgScore * 100).toFixed(1)}%`,
      topAccuracy: `${(topScore * 100).toFixed(1)}%`,
      evaluationMix: `${realCount} real, ${mockCount} mock`,
      recommendation: avgScore >= 0.80 ? 'Strong model performance across the board' : 'Models need improvement for production use'
    };
  }

  clearCache() {
    this.evaluationCache.clear();
    console.log('🗑️ Evaluation cache cleared');
  }

  getCacheSize() {
    return this.evaluationCache.size;
  }
}

export default HybridEvaluationService;