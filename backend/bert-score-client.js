import fetch from 'node-fetch';

class BertScoreClient {
  constructor(baseUrl = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  async calculate(candidate, reference) {
    try {
      const response = await fetch(`${this.baseUrl}/bertscore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate, reference })
      });

      if (!response.ok) {
        throw new Error(`BERTScore API error: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.warn('BERTScore unavailable, using fallback similarity:', error.message);
      // Fallback to simple text similarity
      const similarity = this.calculateSimpleSimilarity(candidate, reference);
      return { 
        precision: similarity, 
        recall: similarity, 
        f1: similarity, 
        fallback: true,
        error: error.message 
      };
    }
  }

  calculateSimpleSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  async isHealthy() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      console.error('BERTScore service health check failed:', error);
      return false;
    }
  }
}

export const bertScoreClient = new BertScoreClient(process.env.BERTSCORE_URL || 'http://localhost:8000');