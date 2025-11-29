// OpenAI embeddings for vector search
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const BATCH_SIZE = 100; // OpenAI allows batch embeddings

/**
 * Generate embedding for a single text
 */
export async function embedText(text) {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      encoding_format: 'float'
    });
    
    return {
      success: true,
      embedding: response.data[0].embedding,
      model: EMBEDDING_MODEL,
      usage: response.usage
    };
  } catch (error) {
    console.error('[Embeddings] Error generating embedding:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate embeddings for multiple texts in batches
 */
export async function embedBatch(texts) {
  console.log(`[Embeddings] Generating embeddings for ${texts.length} texts`);
  
  const results = [];
  
  // Process in batches to respect API limits
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    
    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
        encoding_format: 'float'
      });
      
      const embeddings = response.data.map(item => item.embedding);
      results.push(...embeddings);
      
      console.log(`[Embeddings] Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(texts.length / BATCH_SIZE)}`);
    } catch (error) {
      console.error(`[Embeddings] Batch ${i} failed:`, error.message);
      // Fill with null for failed batches
      results.push(...new Array(batch.length).fill(null));
    }
  }
  
  return results;
}

/**
 * Embed chunks with metadata
 */
export async function embedChunks(chunks) {
  console.log(`[Embeddings] Embedding ${chunks.length} chunks`);
  
  const texts = chunks.map(chunk => chunk.text);
  const embeddings = await embedBatch(texts);
  
  // Attach embeddings to chunks
  const embeddedChunks = chunks.map((chunk, i) => ({
    ...chunk,
    embedding: embeddings[i],
    embeddingModel: EMBEDDING_MODEL,
    hasEmbedding: embeddings[i] !== null
  }));
  
  const successCount = embeddedChunks.filter(c => c.hasEmbedding).length;
  console.log(`[Embeddings] Successfully embedded ${successCount}/${chunks.length} chunks`);
  
  return embeddedChunks;
}

/**
 * Generate query embedding for semantic search
 */
export async function embedQuery(query) {
  console.log(`[Embeddings] Embedding query: "${query.substring(0, 50)}..."`);
  return embedText(query);
}
