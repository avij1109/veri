import rouge from 'rouge';
import { bertScoreClient } from './bert-score-client.js';

// Model-agnostic evaluation that works with any text input/output
export async function evaluateTextOutput(evaluationRequest) {
  const { 
    modelId, 
    taskType, 
    userProvidedOutputs, // Array of {prompt, generated_text} pairs
    customTestCases // Optional: user's own test cases
  } = evaluationRequest;

  // Use provided outputs or default test cases
  const testCases = customTestCases || getDefaultTestCases(taskType);
  
  let totalKeywordScore = 0;
  let totalRougeScore = 0;
  let totalBertScore = 0;
  let totalSemanticScore = 0;
  let evaluations = [];
  
  // If user provided outputs, evaluate those
  if (userProvidedOutputs && userProvidedOutputs.length > 0) {
    for (const output of userProvidedOutputs) {
      const evaluation = await evaluateSingleOutput(
        output.prompt, 
        output.generated_text, 
        taskType,
        output.expected_output || null
      );
      evaluations.push(evaluation);
      
      totalKeywordScore += evaluation.keywordScore || 0;
      totalRougeScore += evaluation.rougeScore || 0;
      totalBertScore += evaluation.bertScore || 0;
      totalSemanticScore += evaluation.semanticScore || 0;
    }
  } else {
    // Use default test cases (without calling external APIs)
    for (const testCase of testCases) {
      // For demo purposes, we'll create synthetic evaluations
      // In real usage, user would provide the actual model outputs
      const evaluation = {
        prompt: testCase.prompt,
        expected: testCase.expected || testCase.reference,
        generated: "User needs to provide actual model output",
        keywordScore: 0,
        rougeScore: 0,
        bertScore: 0,
        semanticScore: 0,
        note: "Provide actual model outputs for real evaluation"
      };
      evaluations.push(evaluation);
    }
  }
  
  const validEvaluations = evaluations.filter(e => e.generated !== "User needs to provide actual model output");
  const count = validEvaluations.length || 1; // Avoid division by zero
  
  const avgKeywordScore = totalKeywordScore / count;
  const avgRougeScore = totalRougeScore / count;
  const avgBertScore = totalBertScore / count;
  const avgSemanticScore = totalSemanticScore / count;
  
  // Multi-dimensional scoring
  const combinedScore = calculateCombinedScore({
    keyword: avgKeywordScore,
    rouge: avgRougeScore,
    bert: avgBertScore,
    semantic: avgSemanticScore
  }, taskType);
  
  return {
    modelId,
    taskType,
    evaluatedAt: new Date().toISOString(),
    metrics: {
      keywordRelevance: Math.round(avgKeywordScore * 100) / 100,
      textOverlap: Math.round(avgRougeScore * 100) / 100,
      semanticSimilarity: Math.round(avgBertScore * 100) / 100,
      overallQuality: Math.round(avgSemanticScore * 100) / 100,
      combinedScore: Math.round(combinedScore * 100) / 100,
      accuracyPercentage: Math.round(combinedScore * 100),
      samplesTested: evaluations.length,
      validEvaluations: validEvaluations.length
    },
    evaluations: evaluations,
    status: 'completed'
  };
}

async function evaluateSingleOutput(prompt, generatedText, taskType, expectedOutput = null) {
  // 1. Keyword/Topic Relevance
  const keywordScore = calculateTopicRelevance(prompt, generatedText, taskType);
  
  // 2. ROUGE Score (if we have expected output)
  let rougeScore = 0;
  if (expectedOutput) {
    try {
      rougeScore = rouge.l(generatedText, expectedOutput);
    } catch (error) {
      console.error('ROUGE calculation failed:', error);
      rougeScore = 0;
    }
  }
  
  // 3. BERTScore (semantic similarity)
  let bertScore = 0;
  if (expectedOutput) {
    try {
      const bert = await bertScoreClient.calculate(generatedText, expectedOutput);
      bertScore = bert.f1 || 0;
    } catch (error) {
      console.error('BERTScore calculation failed:', error);
      // Fallback to simple similarity
      bertScore = calculateSimpleSimilarity(generatedText, expectedOutput);
    }
  }
  
  // 4. General Quality Metrics
  const qualityScore = calculateTextQuality(generatedText, taskType);
  
  return {
    prompt,
    generated: generatedText,
    expected: expectedOutput,
    keywordScore,
    rougeScore,
    bertScore,
    semanticScore: qualityScore,
    timestamp: new Date().toISOString()
  };
}

function calculateTopicRelevance(prompt, generatedText, taskType) {
  const promptWords = extractKeywords(prompt);
  const generatedWords = extractKeywords(generatedText);
  
  let relevantWords = 0;
  for (const word of promptWords) {
    if (generatedWords.includes(word)) {
      relevantWords++;
    }
  }
  
  // Task-specific adjustments
  let baseScore = promptWords.length > 0 ? relevantWords / promptWords.length : 0;
  
  if (taskType === 'text-generation') {
    // For generation, we also want creativity, not just copying
    const uniqueWords = generatedWords.filter(word => !promptWords.includes(word));
    const creativityBonus = Math.min(uniqueWords.length / 10, 0.3); // Max 30% bonus
    baseScore = Math.min(baseScore + creativityBonus, 1.0);
  }
  
  return baseScore;
}

function calculateTextQuality(text, taskType) {
  let score = 0;
  
  // Basic quality checks
  const wordCount = text.split(/\s+/).length;
  const sentenceCount = text.split(/[.!?]+/).length;
  const avgWordsPerSentence = wordCount / (sentenceCount || 1);
  
  // Length appropriateness
  if (taskType === 'text-generation') {
    score += wordCount >= 10 && wordCount <= 100 ? 0.3 : 0.1;
  } else if (taskType === 'text-classification') {
    score += wordCount >= 1 && wordCount <= 20 ? 0.3 : 0.1;
  }
  
  // Sentence structure
  score += avgWordsPerSentence >= 5 && avgWordsPerSentence <= 20 ? 0.3 : 0.1;
  
  // Basic grammar (simple heuristics)
  const hasProperCapitalization = /^[A-Z]/.test(text.trim());
  const hasProperPunctuation = /[.!?]$/.test(text.trim());
  
  score += hasProperCapitalization ? 0.2 : 0;
  score += hasProperPunctuation ? 0.2 : 0;
  
  return Math.min(score, 1.0);
}

function calculateSimpleSimilarity(text1, text2) {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

function extractKeywords(text) {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2)
    .filter(word => !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(word));
}

function calculateCombinedScore(scores, taskType) {
  // Task-specific weighting
  const weights = {
    'text-generation': {
      keyword: 0.2,
      rouge: 0.3,
      bert: 0.3,
      semantic: 0.2
    },
    'text-classification': {
      keyword: 0.4,
      rouge: 0.2,
      bert: 0.3,
      semantic: 0.1
    },
    'question-answering': {
      keyword: 0.3,
      rouge: 0.3,
      bert: 0.4,
      semantic: 0.0
    }
  };
  
  const taskWeights = weights[taskType] || weights['text-generation'];
  
  return (scores.keyword * taskWeights.keyword) +
         (scores.rouge * taskWeights.rouge) +
         (scores.bert * taskWeights.bert) +
         (scores.semantic * taskWeights.semantic);
}

function getDefaultTestCases(taskType) {
  const testCases = {
    'text-generation': [
      {
        prompt: "Write a short story about",
        reference: "A creative narrative with characters, setting, and plot development."
      },
      {
        prompt: "Explain the concept of",
        reference: "A clear, informative explanation with examples and context."
      },
      {
        prompt: "Complete this sentence:",
        reference: "A logical and coherent continuation that makes sense."
      }
    ],
    'text-classification': [
      {
        prompt: "Classify the sentiment:",
        reference: "positive, negative, or neutral"
      },
      {
        prompt: "Categorize this topic:",
        reference: "Appropriate category label"
      }
    ],
    'question-answering': [
      {
        prompt: "Answer this question:",
        reference: "Accurate and relevant answer based on given context."
      }
    ]
  };
  
  return testCases[taskType] || testCases['text-generation'];
}

// Export for use in other modules
export { evaluateSingleOutput, calculateTopicRelevance, calculateTextQuality };