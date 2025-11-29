// In-memory vector store with cosine similarity search
// Can be replaced with Pinecone/Weaviate for production

class VectorStore {
  constructor() {
    this.vectors = new Map(); // modelId -> chunks with embeddings
    this.metadata = new Map(); // vectorId -> metadata
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Upsert chunks with embeddings for a model
   */
  async upsertChunks(modelId, chunksWithEmbeddings) {
    console.log(`[VectorStore] Upserting ${chunksWithEmbeddings.length} chunks for ${modelId}`);
    
    // Filter out chunks without embeddings
    const validChunks = chunksWithEmbeddings.filter(c => c.hasEmbedding && c.embedding);
    
    if (validChunks.length === 0) {
      throw new Error('No valid embeddings to upsert');
    }
    
    // Store chunks with unique IDs
    const storedChunks = validChunks.map((chunk, i) => {
      const vectorId = `${modelId}::${chunk.id}`;
      
      const storedChunk = {
        id: vectorId,
        modelId,
        embedding: chunk.embedding,
        text: chunk.text,
        source: chunk.source,
        sourceUrl: chunk.sourceUrl,
        metadata: chunk.sourceMetadata,
        chunkIndex: i,
        timestamp: new Date().toISOString()
      };
      
      this.metadata.set(vectorId, storedChunk);
      return storedChunk;
    });
    
    // Group by modelId
    if (!this.vectors.has(modelId)) {
      this.vectors.set(modelId, []);
    }
    
    const existingChunks = this.vectors.get(modelId);
    this.vectors.set(modelId, [...existingChunks, ...storedChunks]);
    
    console.log(`[VectorStore] Successfully stored ${storedChunks.length} chunks for ${modelId}`);
    
    return {
      success: true,
      upsertedCount: storedChunks.length,
      modelId
    };
  }

  /**
   * Query top-k similar chunks across all models or specific model
   */
  async query(queryEmbedding, topK = 5, modelId = null) {
    console.log(`[VectorStore] Querying top-${topK} similar chunks${modelId ? ` for ${modelId}` : ' across all models'}`);
    
    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      throw new Error('Invalid query embedding');
    }
    
    // Get all chunks to search
    let allChunks = [];
    if (modelId && this.vectors.has(modelId)) {
      allChunks = this.vectors.get(modelId);
    } else {
      // Search across all models
      for (const chunks of this.vectors.values()) {
        allChunks.push(...chunks);
      }
    }
    
    if (allChunks.length === 0) {
      return {
        matches: [],
        count: 0
      };
    }
    
    // Calculate similarities
    const scored = allChunks.map(chunk => ({
      ...chunk,
      score: this.cosineSimilarity(queryEmbedding, chunk.embedding)
    }));
    
    // Sort by score and take top-k
    const topMatches = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    
    console.log(`[VectorStore] Found ${topMatches.length} matches (scores: ${topMatches.map(m => m.score.toFixed(3)).join(', ')})`);
    
    return {
      matches: topMatches,
      count: topMatches.length
    };
  }

  /**
   * Get all chunks for a model
   */
  getModelChunks(modelId) {
    return this.vectors.get(modelId) || [];
  }

  /**
   * Delete all chunks for a model
   */
  deleteModel(modelId) {
    const chunks = this.vectors.get(modelId) || [];
    
    // Remove from metadata
    for (const chunk of chunks) {
      this.metadata.delete(chunk.id);
    }
    
    // Remove from vectors
    this.vectors.delete(modelId);
    
    console.log(`[VectorStore] Deleted ${chunks.length} chunks for ${modelId}`);
    
    return {
      success: true,
      deletedCount: chunks.length
    };
  }

  /**
   * Get store statistics
   */
  getStats() {
    let totalChunks = 0;
    for (const chunks of this.vectors.values()) {
      totalChunks += chunks.length;
    }
    
    return {
      totalModels: this.vectors.size,
      totalChunks,
      modelsIndexed: Array.from(this.vectors.keys())
    };
  }

  /**
   * Clear entire store (for testing)
   */
  clear() {
    this.vectors.clear();
    this.metadata.clear();
    console.log('[VectorStore] Cleared all data');
  }
}

// Singleton instance
const vectorStore = new VectorStore();

export default vectorStore;

// Export class for testing
export { VectorStore };
