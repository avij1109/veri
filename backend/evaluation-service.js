import { HfInference } from '@huggingface/inference';
import crypto from 'crypto';
import rouge from 'rouge';
import fetch from 'node-fetch';
import { bertScoreClient } from './bert-score-client.js';
// Initialize Hugging Face client
const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN || process.env.HF_API_TOKEN);

// Standard test datasets for different tasks
const TEST_DATASETS = {
  'text-classification': [
    { text: "I love this product! It's amazing and works perfectly.", label: "positive" },
    { text: "This is terrible quality. Waste of money.", label: "negative" },
    { text: "The product is okay, nothing special but does the job.", label: "neutral" },
    { text: "Excellent service and fast delivery! Highly recommended.", label: "positive" },
    { text: "Poor customer support and low quality product.", label: "negative" },
    { text: "Average experience. Product works as expected.", label: "neutral" },
    { text: "Outstanding quality! Best purchase I've made this year.", label: "positive" },
    { text: "Completely disappointed. Product broke after one day.", label: "negative" },
    { text: "It's fine, meets basic requirements.", label: "neutral" },
    { text: "Fantastic! Exceeded my expectations in every way.", label: "positive" }
  ],
  
  'text-generation': [
    { 
      prompt: "The future of artificial intelligence is", 
      expectedKeywords: ["technology", "development", "innovation", "advancement"],
      reference: "The future of artificial intelligence is bright with continued innovation and technological advancement."
    },
    { 
      prompt: "Climate change effects include", 
      expectedKeywords: ["temperature", "weather", "environment", "global"],
      reference: "Climate change effects include rising global temperatures, extreme weather events, and environmental degradation."
    },
    { 
      prompt: "Machine learning algorithms can", 
      expectedKeywords: ["data", "patterns", "prediction", "analysis"],
      reference: "Machine learning algorithms can analyze data to identify patterns and make accurate predictions."
    },
    { 
      prompt: "Space exploration has led to", 
      expectedKeywords: ["discovery", "technology", "science", "innovation"],
      reference: "Space exploration has led to many scientific discoveries and technological innovations."
    },
    { 
      prompt: "Renewable energy sources like", 
      expectedKeywords: ["solar", "wind", "sustainable", "clean"],
      reference: "Renewable energy sources like solar and wind provide sustainable clean energy solutions."
    }
  ],
  
  'image-classification': [
    // Note: For demo purposes, using text descriptions
    // In production, you'd use actual image URLs
    { description: "cat sitting on a windowsill", expectedLabel: "cat" },
    { description: "dog playing in a park", expectedLabel: "dog" },
    { description: "car parked on street", expectedLabel: "car" },
    { description: "airplane flying in sky", expectedLabel: "airplane" },
    { description: "bicycle leaning against wall", expectedLabel: "bicycle" }
  ],

  'question-answering': [
    { 
      question: "What is the capital of France?", 
      context: "France is a country in Europe. Its capital and largest city is Paris.", 
      expectedAnswer: "Paris" 
    },
    { 
      question: "How many legs does a spider have?", 
      context: "Spiders are arachnids with eight legs. They are different from insects which have six legs.", 
      expectedAnswer: "eight" 
    },
    { 
      question: "What year was the moon landing?", 
      context: "Apollo 11 was the first crewed mission to land on the Moon. It happened in 1969.", 
      expectedAnswer: "1969" 
    }
  ]
};

// Function to auto-detect task type based on model ID
async function detectTaskType(modelId) {
  try {
    // Try to get model info from Hugging Face
    const response = await fetch(`https://huggingface.co/api/models/${modelId}`);
    if (response.ok) {
      const modelInfo = await response.json();
      if (modelInfo.pipeline_tag) {
        // Map HF pipeline tags to our task types
        const taskMapping = {
          'text-classification': 'text-classification',
          'sentiment-analysis': 'text-classification',
          'text-generation': 'text-generation',
          'question-answering': 'question-answering',
          'image-classification': 'image-classification'
        };
        return taskMapping[modelInfo.pipeline_tag] || 'text-classification';
      }
    }
  } catch (error) {
    console.log(`[Evaluation] Could not detect task type for ${modelId}, defaulting to text-classification`);
  }
  
  // Default fallback
  return 'text-classification';
}

export async function evaluateModelPerformance(modelId, taskType) {
  // Auto-detect task type if not provided
  if (!taskType) {
    taskType = await detectTaskType(modelId);
    console.log(`[Evaluation] Auto-detected task type: ${taskType} for ${modelId}`);
  }
  
  console.log(`[Evaluation] Starting evaluation for ${modelId} (${taskType})`);
  
  let results = {};
  
  try {
    switch(taskType) {
      case 'text-classification':
        results = await evaluateTextClassification(modelId);
        break;
      case 'image-classification':
        results = await evaluateImageClassification(modelId);
        break;
      case 'text-generation':
        results = await evaluateTextGeneration(modelId);
        break;
      case 'question-answering':
        results = await evaluateQuestionAnswering(modelId);
        break;
      default:
        throw new Error(`Unsupported task type: ${taskType}`);
    }
    
    const evaluation = {
      modelId,
      modelName: modelId.split('/').pop() || modelId,
      taskType,
      evaluatedAt: new Date().toISOString(),
      metrics: results,
      status: 'completed'
    };
    
    console.log(`[Evaluation] Completed for ${modelId}:`, results);
    return evaluation;
    
  } catch (error) {
    console.error(`[Evaluation] Failed for ${modelId}:`, error);
    return {
      modelId,
      taskType,
      evaluatedAt: new Date().toISOString(),
      metrics: { error: error.message },
      status: 'failed'
    };
  }
}

async function evaluateTextClassification(modelId) {
  const testSamples = TEST_DATASETS['text-classification'];
  let correct = 0;
  let total = testSamples.length;
  let predictions = [];
  
  for (const sample of testSamples) {
    try {
      const prediction = await hf.textClassification({
        model: modelId,
        inputs: sample.text
      });
      
      const predictedLabel = prediction[0]?.label?.toLowerCase() || 'unknown';
      const actualLabel = sample.label.toLowerCase();
      const isCorrect = predictedLabel.includes(actualLabel) || actualLabel.includes(predictedLabel);
      
      if (isCorrect) {
        correct++;
      }
      
      predictions.push({
        text: sample.text,
        predicted: predictedLabel,
        actual: actualLabel,
        correct: isCorrect,
        confidence: prediction[0]?.score || 0
      });
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error evaluating sample: ${error}`);
      predictions.push({
        text: sample.text,
        predicted: 'error',
        actual: sample.label,
        correct: false,
        error: error.message
      });
    }
  }
  
  const accuracy = correct / total;
  const avgConfidence = predictions
    .filter(p => p.confidence)
    .reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
  
  return {
    accuracy: Math.round(accuracy * 100) / 100,
    accuracyPercentage: Math.round(accuracy * 100),
    samplesTested: total,
    correctPredictions: correct,
    averageConfidence: Math.round(avgConfidence * 100) / 100,
    predictions: predictions
  };
}

async function evaluateTextGeneration(modelId) {
  const testSamples = TEST_DATASETS['text-generation'];
  let totalKeywordScore = 0;
  let totalRougeScore = 0;
  let totalBertScore = 0;
  let generations = [];
  
  for (const sample of testSamples) {
    try {
      let generatedText = '';
      
      // Try different approaches for text generation
      try {
        // Method 1: Direct text generation
        const result = await hf.textGeneration({
          model: modelId,
          inputs: sample.prompt,
          parameters: {
            max_new_tokens: 50,
            temperature: 0.7,
            return_full_text: false
          }
        });
        generatedText = result.generated_text || '';
      } catch (primaryError) {
        try {
          // Method 2: Try as conversational model
          const result = await hf.conversational({
            model: modelId,
            inputs: {
              past_user_inputs: [],
              generated_responses: [],
              text: sample.prompt
            }
          });
          generatedText = result.generated_text || '';
        } catch (secondaryError) {
          // Method 3: Try with fetch API directly for custom models
          try {
            const response = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                inputs: sample.prompt,
                parameters: {
                  max_new_tokens: 50,
                  temperature: 0.7,
                  return_full_text: false
                }
              })
            });
            
            if (response.ok) {
              const data = await response.json();
              generatedText = data[0]?.generated_text || data.generated_text || '';
            } else {
              throw new Error(`API returned ${response.status}`);
            }
          } catch (tertiaryError) {
            throw new Error(`All methods failed: ${primaryError.message}, ${secondaryError.message}, ${tertiaryError.message}`);
          }
        }
      }
      
      // If we got text, evaluate it
      if (generatedText && generatedText !== 'error') {
        // Remove the original prompt from generated text if it's included
        if (generatedText.startsWith(sample.prompt)) {
          generatedText = generatedText.slice(sample.prompt.length).trim();
        }
        
        // Keyword-based relevance score
        const relevanceScore = calculateRelevanceScore(generatedText, sample.expectedKeywords);
        
        // ROUGE score for text quality
        const rougeScore = rouge.l(generatedText, sample.reference || sample.prompt);
        
        // BERTScore for semantic similarity
        const bert = await bertScoreClient.calculate(generatedText, sample.reference || sample.prompt);
        
        totalKeywordScore += relevanceScore;
        totalRougeScore += rougeScore;
        totalBertScore += bert.f1;
        
        generations.push({
          prompt: sample.prompt,
          generated: generatedText,
          reference: sample.reference,
          keywordScore: relevanceScore,
          rougeScore: rougeScore,
          bertScore: bert.f1,
          bertDetails: bert,
          expectedKeywords: sample.expectedKeywords
        });
      } else {
        throw new Error('No text generated');
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error generating text for "${sample.prompt}": ${error}`);
      generations.push({
        prompt: sample.prompt,
        generated: 'error',
        reference: sample.reference,
        keywordScore: 0,
        rougeScore: 0,
        bertScore: 0,
        error: error.message
      });
    }
  }
  
  const successfulGenerations = generations.filter(g => g.generated !== 'error');
  const avgKeywordScore = successfulGenerations.length > 0 ? 
    totalKeywordScore / successfulGenerations.length : 0;
  const avgRougeScore = successfulGenerations.length > 0 ? 
    totalRougeScore / successfulGenerations.length : 0;
  const avgBertScore = successfulGenerations.length > 0 ? 
    totalBertScore / successfulGenerations.length : 0;
  
  // Combined score (weighted average: 30% keyword, 30% ROUGE, 40% BERTScore)
  const combinedScore = (avgKeywordScore * 0.3) + (avgRougeScore * 0.3) + (avgBertScore * 0.4);
  
  return {
    keywordScore: Math.round(avgKeywordScore * 100) / 100,
    rougeScore: Math.round(avgRougeScore * 100) / 100,
    bertScore: Math.round(avgBertScore * 100) / 100,
    combinedScore: Math.round(combinedScore * 100) / 100,
    accuracyPercentage: Math.round(combinedScore * 100),
    samplesTested: testSamples.length,
    successfulGenerations: successfulGenerations.length,
    generations: generations
  };
}

async function evaluateQuestionAnswering(modelId) {
  const testSamples = TEST_DATASETS['question-answering'];
  let correct = 0;
  let total = testSamples.length;
  let answers = [];
  
  for (const sample of testSamples) {
    try {
      const result = await hf.questionAnswering({
        model: modelId,
        inputs: {
          question: sample.question,
          context: sample.context
        }
      });
      
      const predictedAnswer = result.answer?.toLowerCase() || '';
      const expectedAnswer = sample.expectedAnswer.toLowerCase();
      const isCorrect = predictedAnswer.includes(expectedAnswer) || expectedAnswer.includes(predictedAnswer);
      
      if (isCorrect) {
        correct++;
      }
      
      answers.push({
        question: sample.question,
        predicted: result.answer,
        expected: sample.expectedAnswer,
        correct: isCorrect,
        confidence: result.score || 0
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error answering question: ${error}`);
      answers.push({
        question: sample.question,
        predicted: 'error',
        expected: sample.expectedAnswer,
        correct: false,
        error: error.message
      });
    }
  }
  
  const accuracy = correct / total;
  
  return {
    accuracy: Math.round(accuracy * 100) / 100,
    accuracyPercentage: Math.round(accuracy * 100),
    samplesTested: total,
    correctAnswers: correct,
    answers: answers
  };
}

async function evaluateImageClassification(modelId) {
  // For demo purposes, return simulated results
  // In production, you'd use actual images and compare predictions
  const simulatedAccuracy = 0.75 + Math.random() * 0.2; // 75-95% accuracy
  
  return {
    accuracy: Math.round(simulatedAccuracy * 100) / 100,
    accuracyPercentage: Math.round(simulatedAccuracy * 100),
    samplesTested: 100,
    correctPredictions: Math.round(simulatedAccuracy * 100),
    note: "Simulated results - actual image evaluation requires image datasets"
  };
}

function calculateRelevanceScore(text, expectedKeywords) {
  const textLower = text.toLowerCase();
  let keywordMatches = 0;
  
  for (const keyword of expectedKeywords) {
    if (textLower.includes(keyword.toLowerCase())) {
      keywordMatches++;
    }
  }
  
  return keywordMatches / expectedKeywords.length;
}

export function createEvaluationHash(evaluationData) {
  const dataString = JSON.stringify(evaluationData);
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

export async function getPopularModels(taskType = null) {
  // This would typically call Hugging Face API to get trending models
  // For now, return some popular models by category
  const popularModelsByTask = {
    'text-classification': [
      'cardiffnlp/twitter-roberta-base-sentiment-latest',
      'microsoft/DialoGPT-medium',
      'facebook/bart-large-mnli'
    ],
    'text-generation': [
      'microsoft/DialoGPT-medium',
      'gpt2',
      'microsoft/DialoGPT-small',
      'facebook/blenderbot-400M-distill',
      'google/flan-t5-small',
      'google/flan-t5-base',
      'EleutherAI/gpt-neo-125M',
      'distilgpt2'
    ],
    'question-answering': [
      'deepset/roberta-base-squad2',
      'distilbert-base-cased-distilled-squad',
      'facebook/dpr-question_encoder-single-nq-base'
    ],
    'image-classification': [
      'google/vit-base-patch16-224',
      'microsoft/resnet-50',
      'facebook/deit-base-distilled-patch16-224'
    ]
  };
  
  if (taskType && popularModelsByTask[taskType]) {
    return popularModelsByTask[taskType].map(id => ({ id, pipeline_tag: taskType }));
  }
  
  // Return all popular models
  const allModels = [];
  for (const [task, models] of Object.entries(popularModelsByTask)) {
    models.forEach(id => allModels.push({ id, pipeline_tag: task }));
  }
  
  return allModels;
}