import { contract } from '../contract.js';
import { client } from '../connect.js';
import { runAgentJob } from '../agent/agent.js';
import { ethers } from 'ethers';

let isListening = false;
const jobQueue = [];
let processingQueue = false;

/**
 * Start listening to blockchain events
 */
export function startBlockchainListener() {
  if (isListening) {
    console.log('[Listener] Already listening to blockchain events');
    return;
  }
  
  console.log('[Listener] Starting blockchain event listener...');
  
  // Suppress ethers filter errors globally
  process.on('unhandledRejection', (reason, promise) => {
    const errorMsg = reason?.toString() || '';
    if (errorMsg.includes('filter not found') || errorMsg.includes('could not coalesce error')) {
      return; // Silently ignore filter errors
    }
    console.error('Unhandled Rejection:', reason);
  });
  
  // Listen to RatingSubmitted events
  contract.on('RatingSubmitted', async (modelId, slug, user, score, metadataHash, event) => {
    console.log(`\n[Listener] RatingSubmitted event detected`);
    console.log(`  Model: ${slug}`);
    console.log(`  User: ${user}`);
    console.log(`  Score: ${score}/5`);
    console.log(`  TX: ${event.log.transactionHash}`);
    
    try {
      // Save to database
      const db = client.db('veriAI');
      
      await db.collection('models').updateOne(
        { slug },
        { $set: { lastSeenAt: new Date() }, $setOnInsert: { slug, createdAt: new Date() } },
        { upsert: true }
      );
      
      await db.collection('agent_ratings').insertOne({
        modelSlug: slug,
        user,
        score: Number(score),
        metadataHash,
        txHash: event.log.transactionHash,
        blockNumber: event.log.blockNumber,
        timestamp: Math.floor(Date.now() / 1000),
        savedAt: new Date()
      }).catch(err => {
        if (err.code !== 11000) throw err; // Ignore duplicate tx
      });
      
      // Enqueue agent job
      enqueueAgentJob(slug, 'rating_submitted');
      
    } catch (error) {
      console.error('[Listener] Error handling RatingSubmitted:', error);
    }
  });
  
  // Listen to RatingUpdated events
  contract.on('RatingUpdated', async (modelId, user, newScore, metadataHash, event) => {
    console.log(`\n[Listener] RatingUpdated event detected`);
    console.log(`  Model ID: ${modelId}`);
    console.log(`  User: ${user}`);
    console.log(`  New Score: ${newScore}/5`);
    
    try {
      // Note: We need to get the slug from the modelId
      // For now, we'll trigger a re-analysis
      const slug = await getSlugFromModelId(modelId);
      if (slug) {
        enqueueAgentJob(slug, 'rating_updated');
      }
    } catch (error) {
      console.error('[Listener] Error handling RatingUpdated:', error);
    }
  });
  
  // Listen to RatingSlashed events
  contract.on('RatingSlashed', async (modelId, ratingIndex, user, event) => {
    console.log(`\n[Listener] RatingSlashed event detected`);
    console.log(`  Model ID: ${modelId}`);
    console.log(`  User: ${user}`);
    console.log(`  Rating Index: ${ratingIndex}`);
    
    try {
      const slug = await getSlugFromModelId(modelId);
      if (slug) {
        enqueueAgentJob(slug, 'rating_slashed');
      }
    } catch (error) {
      console.error('[Listener] Error handling RatingSlashed:', error);
    }
  });
  
  // Listen to TrustScoreUpdated events
  contract.on('TrustScoreUpdated', async (modelId, newScore, event) => {
    console.log(`\n[Listener] TrustScoreUpdated event detected`);
    console.log(`  Model ID: ${modelId}`);
    console.log(`  New Trust Score: ${newScore}/100`);
    
    try {
      const slug = await getSlugFromModelId(modelId);
      if (slug) {
        enqueueAgentJob(slug, 'trust_score_updated');
      }
    } catch (error) {
      console.error('[Listener] Error handling TrustScoreUpdated:', error);
    }
  });
  
  isListening = true;
  console.log('[Listener] ✓ Now listening for blockchain events');
}

/**
 * Stop listening to blockchain events
 */
export function stopBlockchainListener() {
  if (!isListening) return;
  
  contract.removeAllListeners();
  isListening = false;
  console.log('[Listener] Stopped blockchain event listener');
}

/**
 * Enqueue an agent job
 */
function enqueueAgentJob(slug, reason) {
  // Debounce: Don't add duplicate jobs for same model within 5 minutes
  const existingJob = jobQueue.find(j => j.slug === slug);
  if (existingJob) {
    console.log(`[Listener] Job for ${slug} already queued, skipping`);
    return;
  }
  
  jobQueue.push({
    slug,
    reason,
    enqueuedAt: Date.now()
  });
  
  console.log(`[Listener] Enqueued agent job: ${slug} (${reason})`);
  
  // Start processing if not already running
  if (!processingQueue) {
    processJobQueue();
  }
}

/**
 * Process the job queue sequentially
 */
async function processJobQueue() {
  if (processingQueue || jobQueue.length === 0) return;
  
  processingQueue = true;
  
  while (jobQueue.length > 0) {
    const job = jobQueue.shift();
    console.log(`\n[Listener] Processing job for ${job.slug}...`);
    
    try {
      await runAgentJob(job.slug, job.reason);
      // Wait 2 seconds between jobs to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`[Listener] Job failed for ${job.slug}:`, error);
    }
  }
  
  processingQueue = false;
}

/**
 * Helper: Get slug from modelId (bytes32)
 * This requires querying the contract or maintaining a mapping
 */
async function getSlugFromModelId(modelId) {
  // For now, we'll return null and skip these events
  // In production, you'd maintain a modelId -> slug mapping in DB
  console.log(`[Listener] Need to implement modelId -> slug mapping for: ${modelId}`);
  return null;
}

/**
 * Get listener status
 */
export function getListenerStatus() {
  return {
    isListening,
    queueLength: jobQueue.length,
    processingQueue
  };
}

export default {
  startBlockchainListener,
  stopBlockchainListener,
  getListenerStatus
};
