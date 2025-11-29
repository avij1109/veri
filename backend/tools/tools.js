import { contract, getExplorerUrl } from '../contract.js';
import { ethers } from 'ethers';
import fetch from 'node-fetch';

/**
 * Tool: Get on-chain ratings for a model
 */
export async function get_chain_ratings(slug) {
  try {
    console.log(`[Tool] Getting chain ratings for: ${slug}`);
    
    const ratings = await contract.getModelRatings(slug);
    
    // Format ratings with additional context
    const formattedRatings = await Promise.all(ratings.map(async (rating, index) => {
      return {
        index,
        user: rating.user,
        score: Number(rating.score),
        metadataHash: rating.metadataHash,
        stake: ethers.formatEther(rating.stake),
        timestamp: Number(rating.timestamp),
        timestampISO: new Date(Number(rating.timestamp) * 1000).toISOString(),
        slashed: rating.slashed,
        weight: Number(rating.weight)
      };
    }));
    
    return {
      success: true,
      slug,
      ratings: formattedRatings,
      totalRatings: formattedRatings.length
    };
  } catch (error) {
    console.error(`[Tool] Error getting chain ratings:`, error.message);
    return { success: false, error: error.message, ratings: [] };
  }
}

/**
 * Tool: Get model statistics from blockchain
 */
export async function get_model_stats(slug) {
  try {
    console.log(`[Tool] Getting model stats for: ${slug}`);
    
    const stats = await contract.getModelStats(slug);
    
    return {
      success: true,
      slug,
      trustScore: Number(stats[0]),
      totalRatings: Number(stats[1]),
      activeRatings: Number(stats[2]),
      averageScore: Number(stats[3]),
      totalStaked: ethers.formatEther(stats[4])
    };
  } catch (error) {
    console.error(`[Tool] Error getting model stats:`, error.message);
    return {
      success: false,
      error: error.message,
      trustScore: 0,
      totalRatings: 0,
      activeRatings: 0,
      averageScore: 0,
      totalStaked: '0'
    };
  }
}

/**
 * Tool: Fetch model card from Hugging Face
 */
export async function get_model_card(slug) {
  try {
    console.log(`[Tool] Fetching model card for: ${slug}`);
    
    const response = await fetch(`https://huggingface.co/api/models/${slug}`);
    
    if (!response.ok) {
      return {
        success: false,
        error: `HF API returned ${response.status}`,
        modelCard: null
      };
    }
    
    const data = await response.json();
    
    // Extract relevant claims and metadata
    return {
      success: true,
      slug,
      modelCard: {
        id: data.id,
        author: data.author,
        downloads: data.downloads || 0,
        likes: data.likes || 0,
        tags: data.tags || [],
        pipeline_tag: data.pipeline_tag,
        library_name: data.library_name,
        created_at: data.created_at,
        last_modified: data.lastModified,
        cardData: data.cardData || {}
      }
    };
  } catch (error) {
    console.error(`[Tool] Error fetching model card:`, error.message);
    return { success: false, error: error.message, modelCard: null };
  }
}

/**
 * Tool: Get benchmark results from backend
 */
export async function get_benchmark(slug) {
  try {
    console.log(`[Tool] Getting benchmark for: ${slug}`);
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(`${backendUrl}/api/evaluation/${slug}`);
    
    if (!response.ok) {
      return { success: false, error: `Backend returned ${response.status}`, benchmark: null };
    }
    
    const data = await response.json();
    
    return {
      success: true,
      slug,
      benchmark: data
    };
  } catch (error) {
    console.error(`[Tool] Error getting benchmark:`, error.message);
    return { success: false, error: error.message, benchmark: null };
  }
}

/**
 * Tool: Detect anomalies in ratings
 */
export async function detect_anomalies(slug, ratings, stats) {
  try {
    console.log(`[Tool] Detecting anomalies for: ${slug}`);
    
    const anomalies = {
      flags: [],
      riskScore: 0,
      details: {}
    };
    
    // Anomaly 1: Rate spike (many ratings in short time window)
    if (ratings.length >= 5) {
      const recentWindow = 3600; // 1 hour in seconds
      const now = Math.floor(Date.now() / 1000);
      const recentRatings = ratings.filter(r => (now - r.timestamp) < recentWindow);
      
      if (recentRatings.length >= 5) {
        anomalies.flags.push({
          type: 'rate_spike',
          severity: 'medium',
          detail: `${recentRatings.length} ratings in last hour`,
          evidence: recentRatings.map(r => ({ user: r.user, timestamp: r.timestampISO }))
        });
        anomalies.riskScore += 20;
      }
    }
    
    // Anomaly 2: New wallet clustering (same age wallets)
    const newWallets = ratings.filter(r => r.timestamp > (Date.now() / 1000 - 86400 * 7)); // Created in last week
    if (newWallets.length >= 3 && ratings.length > 0 && (newWallets.length / ratings.length) > 0.5) {
      anomalies.flags.push({
        type: 'new_wallet_cluster',
        severity: 'high',
        detail: `${newWallets.length} out of ${ratings.length} ratings from new wallets (${Math.round(newWallets.length / ratings.length * 100)}%)`,
        evidence: newWallets.map(r => ({ user: r.user, age: 'less than 7 days' }))
      });
      anomalies.riskScore += 35;
    }
    
    // Anomaly 3: Whale stake (single entity controlling large percentage)
    if (ratings.length > 0) {
      const totalStake = ratings.reduce((sum, r) => sum + parseFloat(r.stake), 0);
      const maxStake = Math.max(...ratings.map(r => parseFloat(r.stake)));
      const whaleRating = ratings.find(r => parseFloat(r.stake) === maxStake);
      
      if (totalStake > 0 && (maxStake / totalStake) > 0.40) {
        anomalies.flags.push({
          type: 'whale_stake',
          severity: 'high',
          detail: `Single address controls ${Math.round(maxStake / totalStake * 100)}% of total stake`,
          evidence: {
            user: whaleRating.user,
            stake: whaleRating.stake,
            percentage: Math.round(maxStake / totalStake * 100)
          }
        });
        anomalies.riskScore += 30;
      }
    }
    
    // Anomaly 4: Duplicate scores pattern (possible bot)
    const scoreDistribution = {};
    ratings.forEach(r => {
      scoreDistribution[r.score] = (scoreDistribution[r.score] || 0) + 1;
    });
    
    const dominantScore = Object.keys(scoreDistribution).reduce((a, b) => 
      scoreDistribution[a] > scoreDistribution[b] ? a : b
    );
    
    if (ratings.length >= 5 && scoreDistribution[dominantScore] / ratings.length > 0.80) {
      anomalies.flags.push({
        type: 'score_uniformity',
        severity: 'medium',
        detail: `${Math.round(scoreDistribution[dominantScore] / ratings.length * 100)}% of ratings are ${dominantScore}/5`,
        evidence: scoreDistribution
      });
      anomalies.riskScore += 15;
    }
    
    // Anomaly 5: Slashed ratings presence
    const slashedCount = ratings.filter(r => r.slashed).length;
    if (slashedCount > 0) {
      anomalies.flags.push({
        type: 'slashed_ratings',
        severity: 'high',
        detail: `${slashedCount} ratings have been slashed`,
        evidence: ratings.filter(r => r.slashed).map(r => ({ user: r.user, score: r.score }))
      });
      anomalies.riskScore += 25;
    }
    
    anomalies.riskLevel = anomalies.riskScore >= 60 ? 'HIGH' : anomalies.riskScore >= 30 ? 'MEDIUM' : 'LOW';
    
    return {
      success: true,
      slug,
      anomalies
    };
  } catch (error) {
    console.error(`[Tool] Error detecting anomalies:`, error.message);
    return {
      success: false,
      error: error.message,
      anomalies: { flags: [], riskScore: 0, riskLevel: 'UNKNOWN' }
    };
  }
}

/**
 * Tool: Compare claimed vs measured accuracy
 */
export async function compare_accuracy(slug, modelCard, benchmark) {
  try {
    console.log(`[Tool] Comparing accuracy for: ${slug}`);
    
    if (!modelCard || !benchmark) {
      return {
        success: false,
        error: 'Missing model card or benchmark data',
        comparison: null
      };
    }
    
    // Extract claimed accuracy from model card
    const claimed = modelCard.cardData?.accuracy || 
                    modelCard.cardData?.eval_results?.[0]?.value ||
                    null;
    
    // Extract measured accuracy from benchmark
    const measured = benchmark.metrics?.accuracyPercentage / 100 ||
                     benchmark.accuracy ||
                     null;
    
    if (!claimed && !measured) {
      return {
        success: false,
        error: 'No accuracy data available',
        comparison: null
      };
    }
    
    const difference = claimed && measured ? Math.abs(claimed - measured) : null;
    const mismatch = difference !== null && difference > 0.10; // >10% difference
    
    return {
      success: true,
      slug,
      comparison: {
        claimed: claimed,
        measured: measured,
        difference: difference,
        mismatch: mismatch,
        severity: mismatch ? (difference > 0.25 ? 'high' : 'medium') : 'low'
      }
    };
  } catch (error) {
    console.error(`[Tool] Error comparing accuracy:`, error.message);
    return { success: false, error: error.message, comparison: null };
  }
}

/**
 * Tool: Get historical trend data
 */
export async function get_historical_trend(slug, db) {
  try {
    console.log(`[Tool] Getting historical trend for: ${slug}`);
    
    const insights = await db.collection('insights')
      .find({ modelSlug: slug })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    
    const snapshots = await db.collection('trust_snapshots')
      .find({ modelSlug: slug })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
    
    return {
      success: true,
      slug,
      historical: {
        recentInsights: insights,
        trustScoreHistory: snapshots
      }
    };
  } catch (error) {
    console.error(`[Tool] Error getting historical trend:`, error.message);
    return { success: false, error: error.message, historical: null };
  }
}

export default {
  get_chain_ratings,
  get_model_stats,
  get_model_card,
  get_benchmark,
  detect_anomalies,
  compare_accuracy,
  get_historical_trend
};
