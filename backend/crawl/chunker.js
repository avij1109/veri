// Text chunking and cleaning utilities

/**
 * Clean and normalize text before chunking
 */
export function cleanText(text) {
  if (!text) return '';
  
  // Remove HTML tags
  let cleaned = text.replace(/<[^>]*>/g, ' ');
  
  // Remove code blocks but keep their content
  cleaned = cleaned.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/```\w*\n?/g, '').trim();
  });
  
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // Remove URLs (optional - you might want to keep them)
  // cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '[URL]');
  
  // Remove email addresses for PII protection
  cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
  
  return cleaned.trim();
}

/**
 * Chunk text into smaller pieces for embedding
 * Uses paragraph-aware splitting with overlap
 */
export function chunkText(text, maxChars = 1500, overlapChars = 200) {
  const cleaned = cleanText(text);
  
  // Split by paragraphs
  const paragraphs = cleaned.split(/\n{2,}/).filter(Boolean);
  
  const chunks = [];
  let currentChunk = '';
  let chunkIndex = 0;
  
  for (const para of paragraphs) {
    // If single paragraph is too long, split by sentences
    if (para.length > maxChars) {
      const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
      
      for (const sentence of sentences) {
        if ((currentChunk + ' ' + sentence).length <= maxChars) {
          currentChunk += (currentChunk ? ' ' : '') + sentence;
        } else {
          if (currentChunk) {
            chunks.push({
              id: `chunk_${chunkIndex++}`,
              text: currentChunk.trim(),
              charCount: currentChunk.length
            });
          }
          currentChunk = sentence;
        }
      }
    } else {
      // Normal paragraph handling
      if ((currentChunk + '\n\n' + para).length <= maxChars) {
        currentChunk += (currentChunk ? '\n\n' : '') + para;
      } else {
        if (currentChunk) {
          chunks.push({
            id: `chunk_${chunkIndex++}`,
            text: currentChunk.trim(),
            charCount: currentChunk.length
          });
        }
        currentChunk = para;
      }
    }
  }
  
  // Add final chunk
  if (currentChunk) {
    chunks.push({
      id: `chunk_${chunkIndex}`,
      text: currentChunk.trim(),
      charCount: currentChunk.length
    });
  }
  
  // Add overlap between chunks for better context retention
  if (overlapChars > 0 && chunks.length > 1) {
    for (let i = 1; i < chunks.length; i++) {
      const prevChunk = chunks[i - 1].text;
      const overlapText = prevChunk.slice(-overlapChars);
      chunks[i].text = overlapText + ' [...] ' + chunks[i].text;
      chunks[i].hasOverlap = true;
    }
  }
  
  return chunks;
}

/**
 * Process multiple text sources and create tagged chunks
 */
export function processTextSources(textSources, modelId) {
  console.log(`[Chunker] Processing ${textSources.length} text sources for ${modelId}`);
  
  const allChunks = [];
  
  for (const source of textSources) {
    const chunks = chunkText(source.text);
    
    // Add metadata to each chunk
    const taggedChunks = chunks.map(chunk => ({
      ...chunk,
      modelId,
      source: source.source,
      sourceUrl: source.url,
      sourceMetadata: source.metadata
    }));
    
    allChunks.push(...taggedChunks);
  }
  
  console.log(`[Chunker] Created ${allChunks.length} chunks total`);
  
  return allChunks;
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 chars)
 */
export function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

/**
 * Validate chunk quality
 */
export function validateChunk(chunk) {
  const minChars = 50;
  const maxChars = 2000;
  
  if (!chunk.text || chunk.text.length < minChars) {
    return { valid: false, reason: 'Too short' };
  }
  
  if (chunk.text.length > maxChars) {
    return { valid: false, reason: 'Too long' };
  }
  
  // Check for gibberish (too many special characters)
  const specialCharRatio = (chunk.text.match(/[^a-zA-Z0-9\s]/g) || []).length / chunk.text.length;
  if (specialCharRatio > 0.5) {
    return { valid: false, reason: 'Too many special characters' };
  }
  
  return { valid: true };
}
