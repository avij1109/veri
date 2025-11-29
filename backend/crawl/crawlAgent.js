// Main crawl agent orchestrator
import { fetchAllSources } from './fetchers.js';
import { processTextSources } from './chunker.js';
import { embedChunks, embedQuery } from './embeddings.js';
import vectorStore from './vectorStore.js';
import { runRagAnalysis, generateTaskPrompt } from './ragReasoner.js';
import { verifyVerdict, flagHallucinations } from './hallucinationGuard.js';
import { client } from '../connect.js';
import { contract } from '../contract.js';

/**
 * Main crawl and index pipeline
 * Fetches, chunks, embeds, and stores model data
 */
export async function crawlAndIndex(modelId) {
  console.log(`\n[CrawlAgent] Starting crawl pipeline for: ${modelId}`);
  const startTime = Date.now();
  
  try {
    // Step 1: Fetch from all sources
    console.log('[CrawlAgent] Step 1: Fetching from all sources...');
    const fetchResult = await fetchAllSources(modelId, contract);
    
    if (!fetchResult.success) {
      throw new Error('Failed to fetch model data from any source');
    }
    
    // Step 2: Chunk text
    console.log('[CrawlAgent] Step 2: Chunking text...');
    const chunks = processTextSources(fetchResult.allText, modelId);
    
    if (chunks.length === 0) {
      throw new Error('No valid text chunks created');
    }
    
    // Step 3: Generate embeddings
    console.log('[CrawlAgent] Step 3: Generating embeddings...');
    const embeddedChunks = await embedChunks(chunks);
    
    const validChunks = embeddedChunks.filter(c => c.hasEmbedding);
    if (validChunks.length === 0) {
      throw new Error('No valid embeddings generated');
    }
    
    // Step 4: Upsert to vector store
    console.log('[CrawlAgent] Step 4: Upserting to vector store...');
    await vectorStore.upsertChunks(modelId, validChunks);
    
    // Step 5: Save metadata to database
    console.log('[CrawlAgent] Step 5: Saving crawl metadata...');
    const db = client.db('veriAI');
    await db.collection('crawl_index').insertOne({
      modelId,
      timestamp: new Date(),
      sources: Object.keys(fetchResult.sources),
      chunksIndexed: validChunks.length,
      fetchResult: {
        huggingface: fetchResult.sources.huggingface?.metadata,
        github: fetchResult.sources.github?.metadata,
        blockchain: fetchResult.sources.blockchain?.stats
      },
      duration: Date.now() - startTime
    });
    
    const duration = Date.now() - startTime;
    console.log(`[CrawlAgent] ✓ Crawl complete in ${(duration / 1000).toFixed(2)}s`);
    console.log(`[CrawlAgent]   Chunks indexed: ${validChunks.length}`);
    console.log(`[CrawlAgent]   Sources: ${Object.keys(fetchResult.sources).join(', ')}`);
    
    return {
      success: true,
      modelId,
      chunksIndexed: validChunks.length,
      sources: fetchResult.sources,
      duration
    };
    
  } catch (error) {
    console.error(`[CrawlAgent] Crawl failed for ${modelId}:`, error.message);
    return {
      success: false,
      modelId,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Run RAG-based analysis on indexed model
 */
export async function analyzeModel(modelId, analysisType = 'full_audit') {
  console.log(`\n[CrawlAgent] Starting RAG analysis for: ${modelId} (${analysisType})`);
  const startTime = Date.now();
  
  try {
    // Step 1: Generate query embedding
    console.log('[CrawlAgent] Step 1: Generating query embedding...');
    const taskPrompt = generateTaskPrompt(analysisType, modelId);
    const queryResult = await embedQuery(taskPrompt);
    
    if (!queryResult.success) {
      throw new Error('Failed to generate query embedding');
    }
    
    // Step 2: Retrieve relevant contexts
    console.log('[CrawlAgent] Step 2: Retrieving relevant contexts...');
    const retrievalResult = await vectorStore.query(
      queryResult.embedding,
      10, // top-k
      modelId // only search this model
    );
    
    if (retrievalResult.matches.length === 0) {
      throw new Error('No indexed data found for this model. Run /crawl first.');
    }
    
    // Step 3: Run RAG analysis
    console.log('[CrawlAgent] Step 3: Running RAG analysis with GPT-4o-mini...');
    const ragResult = await runRagAnalysis(
      modelId,
      taskPrompt,
      retrievalResult.matches
    );
    
    if (!ragResult.success) {
      throw new Error(`RAG analysis failed: ${ragResult.error}`);
    }
    
    // Step 4: Verify verdict (hallucination guard)
    console.log('[CrawlAgent] Step 4: Verifying verdict...');
    const verifiedVerdict = verifyVerdict(ragResult.verdict, retrievalResult.matches);
    const hallucinationFlags = flagHallucinations(verifiedVerdict);
    
    // Step 5: Save analysis to database
    console.log('[CrawlAgent] Step 5: Saving analysis...');
    const db = client.db('veriAI');
    const analysisDoc = {
      modelId,
      analysisType,
      timestamp: new Date(),
      verdict: verifiedVerdict,
      hallucination: hallucinationFlags,
      contexts: retrievalResult.matches.map(m => ({
        source: m.source,
        url: m.sourceUrl,
        score: m.score,
        textPreview: m.text.substring(0, 200)
      })),
      duration: Date.now() - startTime
    };
    
    const result = await db.collection('crawl_analyses').insertOne(analysisDoc);
    
    const duration = Date.now() - startTime;
    console.log(`[CrawlAgent] ✓ Analysis complete in ${(duration / 1000).toFixed(2)}s`);
    console.log(`[CrawlAgent]   Risk Level: ${verifiedVerdict.risk_level}`);
    console.log(`[CrawlAgent]   Confidence: ${(verifiedVerdict.confidence * 100).toFixed(1)}%`);
    console.log(`[CrawlAgent]   Verification: ${verifiedVerdict.verification?.status}`);
    console.log(`[CrawlAgent]   Findings: ${verifiedVerdict.findings?.length || 0}`);
    
    return {
      success: true,
      analysisId: result.insertedId,
      modelId,
      verdict: verifiedVerdict,
      hallucination: hallucinationFlags,
      contextsUsed: retrievalResult.matches.length,
      duration
    };
    
  } catch (error) {
    console.error(`[CrawlAgent] Analysis failed for ${modelId}:`, error.message);
    return {
      success: false,
      modelId,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Get latest analysis for a model
 */
export async function getLatestAnalysis(modelId) {
  const db = client.db('veriAI');
  const analysis = await db.collection('crawl_analyses')
    .findOne({ modelId }, { sort: { timestamp: -1 } });
  
  return analysis;
}

/**
 * Semantic search across all indexed models
 */
export async function semanticSearch(query, limit = 10, modelId = null) {
  console.log(`[CrawlAgent] Semantic search: "${query}" (${modelId ? `model: ${modelId}` : 'all models'})`);
  
  try {
    const topK = Number.isFinite(limit) && limit > 0 ? limit : 10;

    // Generate query embedding
    const queryResult = await embedQuery(query);
    
    if (!queryResult.success) {
      throw new Error(queryResult.error || 'Failed to generate query embedding');
    }
    
    // Search across all models or a specific model
    const retrievalResult = await vectorStore.query(
      queryResult.embedding,
      topK,
      modelId || undefined
    );

    const matches = retrievalResult.matches.map(match => ({
      modelId: match.modelId,
      text: match.text,
      similarity: match.score,
      sourceUrl: match.sourceUrl,
      metadata: {
        source: match.source,
        ...(match.metadata || {})
      },
      chunkId: match.id,
      retrievedAt: match.timestamp
    }));

    // Aggregate scores per model for additional context
    const aggregatedScores = matches.reduce((acc, match) => {
      acc.set(match.modelId, (acc.get(match.modelId) || 0) + match.similarity);
      return acc;
    }, new Map());

    const topModels = Array.from(aggregatedScores.entries())
      .map(([id, score]) => ({ modelId: id, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    
    return {
      success: true,
      query,
      totalResults: matches.length,
      totalMatches: retrievalResult.count,
      results: matches,
      topModels
    };
    
  } catch (error) {
    console.error('[CrawlAgent] Search failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get vector store statistics
 */
export function getIndexStats() {
  return vectorStore.getStats();
}
