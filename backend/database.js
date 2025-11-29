import { MongoClient } from 'mongodb';
import crypto from 'crypto';

let db;
let evaluationsCollection;

export async function initializeDatabase() {
  try {
    const client = new MongoClient(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017');
    await client.connect();
    db = client.db('veriAI');
    evaluationsCollection = db.collection('evaluations');
    
    // Create indexes for better performance
    await evaluationsCollection.createIndex({ modelId: 1 });
    await evaluationsCollection.createIndex({ taskType: 1 });
    await evaluationsCollection.createIndex({ createdAt: -1 });
    await evaluationsCollection.createIndex({ 'metrics.accuracyPercentage': -1 });
    await evaluationsCollection.createIndex({ accuracy: -1 }); // For automated evaluations
    await evaluationsCollection.createIndex({ evaluationType: 1 });
    await evaluationsCollection.createIndex({ cacheExpiry: 1 });
    
    console.log('[Database] Connected to MongoDB and initialized evaluations collection');
  } catch (error) {
    console.error('[Database] Failed to connect:', error);
    throw error;
  }
}

export function storeEvaluationResults(evaluationData) {
  const evaluationHash = createEvaluationHash(evaluationData);
  
  const evaluation = {
    modelId: evaluationData.modelId,
    taskType: evaluationData.taskType,
    metrics: evaluationData.metrics,
    evaluationHash: evaluationHash,
    status: evaluationData.status,
    createdAt: new Date(),
    evaluatedAt: evaluationData.evaluatedAt,
    evaluationType: 'manual' // To distinguish from automated evaluations
  };
  
  // Store in database
  evaluationsCollection.insertOne(evaluation).catch(error => {
    console.error('[Database] Failed to store evaluation:', error);
  });
  
  return evaluationHash;
}

// Add automated evaluation results storage and caching
export async function storeAutomatedEvaluationResults(evaluationResult) {
  try {
    const evaluation = {
      ...evaluationResult,
      createdAt: new Date(),
      cacheExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours cache
      evaluationType: 'automated'
    };
    
    // Replace any existing evaluation for this model and task
    await evaluationsCollection.replaceOne(
      { 
        modelId: evaluationResult.modelId, 
        taskType: evaluationResult.taskType,
        evaluationType: 'automated'
      },
      evaluation,
      { upsert: true }
    );
    
    console.log(`[Database] Stored automated evaluation for ${evaluationResult.modelId}`);
    return evaluation;
  } catch (error) {
    console.error('[Database] Failed to store automated evaluation:', error);
    throw error;
  }
}

export async function getCachedEvaluationResults(modelId, taskType) {
  try {
    const result = await evaluationsCollection.findOne({
      modelId,
      taskType,
      evaluationType: 'automated',
      cacheExpiry: { $gt: new Date() } // Only return if cache hasn't expired
    });
    
    if (result) {
      console.log(`[Database] Found cached evaluation for ${modelId}`);
      return result;
    }
    
    console.log(`[Database] No cached evaluation found for ${modelId}`);
    return null;
  } catch (error) {
    console.error('[Database] Failed to get cached evaluation:', error);
    return null;
  }
}

export async function getAllEvaluationResults(taskType = null) {
  try {
    const query = { evaluationType: 'automated' };
    if (taskType) {
      query.taskType = taskType;
    }
    
    const results = await evaluationsCollection
      .find(query)
      .sort({ accuracy: -1, evaluatedAt: -1 })
      .toArray();
    
    return results;
  } catch (error) {
    console.error('[Database] Failed to get all evaluations:', error);
    return [];
  }
}

export async function getTopModelsByTask(taskType, limit = 5) {
  try {
    const results = await evaluationsCollection
      .find({ 
        taskType,
        evaluationType: 'automated',
        status: 'completed'
      })
      .sort({ accuracy: -1 })
      .limit(limit)
      .toArray();
    
    return results;
  } catch (error) {
    console.error('[Database] Failed to get top models:', error);
    return [];
  }
}

export async function getEvaluationResults(modelId) {
  try {
    const result = await evaluationsCollection
      .findOne(
        { modelId: modelId, status: 'completed' },
        { sort: { createdAt: -1 } }
      );
    return result;
  } catch (error) {
    console.error('[Database] Failed to get evaluation results:', error);
    return null;
  }
}

export async function getAllEvaluations(taskType = null, limit = 100) {
  try {
    const query = taskType ? { taskType, status: 'completed' } : { status: 'completed' };
    const results = await evaluationsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return results;
  } catch (error) {
    console.error('[Database] Failed to get all evaluations:', error);
    return [];
  }
}

export async function searchModelsByAccuracy(minAccuracy = 70, taskType = null) {
  try {
    const query = {
      status: 'completed',
      $or: [
        { 'metrics.accuracyPercentage': { $gte: minAccuracy } }, // For manual evaluations
        { 'accuracy': { $gte: minAccuracy } } // For automated evaluations
      ]
    };
    
    if (taskType) {
      query.taskType = taskType;
    }
    
    const results = await evaluationsCollection
      .find(query)
      .sort({ 
        'metrics.accuracyPercentage': -1,
        'accuracy': -1
      })
      .toArray();
    
    return results;
  } catch (error) {
    console.error('[Database] Failed to search models by accuracy:', error);
    return [];
  }
}

export async function isEvaluationOld(evaluationDate, maxAgeHours = 24) {
  const now = new Date();
  const evalDate = new Date(evaluationDate);
  const hoursDiff = (now - evalDate) / (1000 * 60 * 60);
  return hoursDiff > maxAgeHours;
}

export function createEvaluationHash(evaluationData) {
  const dataToHash = {
    modelId: evaluationData.modelId,
    taskType: evaluationData.taskType,
    metrics: evaluationData.metrics,
    evaluatedAt: evaluationData.evaluatedAt
  };
  
  const dataString = JSON.stringify(dataToHash);
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

export async function getModelRecommendations(taskType, userQuery = '', limit = 5) {
  try {
    // Get top models by accuracy for the task type
    const topModels = await getTopModelsByTask(taskType, limit * 2);
    
    // If we have a user query, we could implement more sophisticated matching
    // For now, just return top models by accuracy
    return topModels.slice(0, limit);
  } catch (error) {
    console.error('[Database] Failed to get model recommendations:', error);
    return [];
  }
}

export async function getModelStats(modelId = null) {
  try {
    if (modelId) {
      // Get stats for a specific model
      const evaluation = await getEvaluationResults(modelId);
      if (!evaluation) {
        return null;
      }
      
      return {
        modelId: evaluation.modelId,
        taskType: evaluation.taskType,
        accuracy: evaluation.metrics?.accuracyPercentage || evaluation.accuracy || 0,
        samplesTested: evaluation.metrics?.samplesTested || evaluation.samplesTested || 0,
        evaluatedAt: evaluation.evaluatedAt,
        status: evaluation.status
      };
    } else {
      // Get overall stats
      const totalModels = await evaluationsCollection.countDocuments();
      const completedEvaluations = await evaluationsCollection.countDocuments({ status: 'completed' });
      
      return {
        totalModels,
        completedEvaluations,
        successRate: totalModels > 0 ? (completedEvaluations / totalModels * 100) : 0
      };
    }
  } catch (error) {
    console.error('[Database] Failed to get model stats:', error);
    return null;
  }
}

export async function getRecentEvaluationResults(limit = 10) {
  try {
    if (!evaluationsCollection) {
      console.warn('[Database] Evaluations collection not initialized');
      return [];
    }
    
    // Get recent evaluations, prioritizing automated ones, sorted by evaluation date
    const recentEvaluations = await evaluationsCollection
      .find({})
      .sort({ evaluatedAt: -1, createdAt: -1 })
      .limit(limit)
      .toArray();
    
    return recentEvaluations;
  } catch (error) {
    console.error('[Database] Failed to get recent evaluations:', error);
    return [];
  }
}