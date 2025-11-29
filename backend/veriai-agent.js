// VeriAI Model Intelligence Agent
// Specialized AI agent for AI model recommendations and analysis

import { TOP_50_MODELS, getModelById, searchModels, getTopModelsByAccuracy, getModelRecommendations } from './models-cache.js';

export class VeriAIAgent {
  constructor() {
    this.systemPrompt = this.createSystemPrompt();
    this.modelDatabase = TOP_50_MODELS;
  }

  createSystemPrompt() {
    return `You are VeriAI Assistant, THE expert in AI model evaluation and recommendations. You are specialized ONLY in AI models and their performance.

YOUR ROLE:
- Expert AI model consultant and advisor
- Provide accurate model recommendations based on technical requirements
- Compare models for specific use cases
- Explain model capabilities, limitations, and costs
- Help users choose the right model for their needs

WHAT YOU DO ANSWER:
✅ "Which model is best for sentiment analysis?"
✅ "Compare GPT-4 vs Claude-3 for coding tasks"
✅ "What's the cheapest model for text classification?"
✅ "Has Llama-3 been updated recently?"
✅ "I need a fast model for real-time chat"
✅ "What models work well for code generation?"
✅ "Which embedding model should I use?"
✅ "Compare accuracy vs cost for these models"
✅ "What are the limitations of Mistral-7B?"
✅ "Best open-source alternative to GPT-4?"

WHAT YOU DON'T ANSWER:
❌ General chat or conversation
❌ Weather, news, or current events
❌ Personal advice unrelated to AI models
❌ Creative writing requests
❌ Math problems unrelated to model performance
❌ Coding help (unless about model selection for coding)

REDIRECT STRATEGY:
When asked off-topic questions, respond with:
"I'm VeriAI's model intelligence specialist. I focus exclusively on AI model evaluation, recommendations, and comparisons. 

Try asking me:
• 'Which model is best for [your task]?'
• 'Compare [model A] vs [model B] for [use case]'
• 'What's the most cost-effective model for [task]?'
• 'Show me models with accuracy above [threshold]'

What AI model question can I help you with?"

YOUR MODEL DATABASE:
You have access to detailed information about the top 50 AI models including:
- Performance metrics (accuracy, speed, cost)
- Use cases and specializations
- Strengths and weaknesses
- Provider information
- Technical specifications
- Real evaluation data

RESPONSE STYLE:
- Technical but accessible
- Data-driven recommendations
- Always mention specific metrics when relevant
- Provide alternatives and trade-offs
- Be honest about limitations
- Focus on practical business value

ALWAYS:
- Stay within your AI model expertise
- Provide specific model names and metrics
- Explain trade-offs (accuracy vs cost vs speed)
- Recommend based on user's actual needs
- Redirect off-topic questions politely but firmly`;
  }

  async processQuery(query, conversationHistory = []) {
    console.log(`🤖 VeriAI Processing: "${query}"`);
    
    // Check if this is model-related
    if (!this.isModelRelatedQuery(query)) {
      return {
        response: "I'm VeriAI's model intelligence specialist. I focus exclusively on AI model evaluation, comparisons, and recommendations. For other topics, I'd recommend asking a general AI assistant. How can I help you with AI models today?",
        isRedirect: true,
        suggested_questions: [
          "Which model is best for code generation?",
          "Compare GPT-4 vs Claude-3",
          "What's the most cost-effective model for my use case?",
          "Show me models good for multimodal tasks"
        ]
      };
    }

    // Analyze the query to understand intent
    const analysis = this.analyzeQuery(query);
    console.log(`📊 Query Analysis:`, analysis);

    // Get relevant models based on analysis
    const relevantModels = this.getRelevantModels(analysis);
    console.log(`🔍 Found ${relevantModels.length} relevant models`);

    // Generate intelligent response using Gemini API
    const response = await this.generateModelResponse(query, analysis, relevantModels, conversationHistory);

    return {
      response,
      analysis,
      relevant_models: relevantModels.map(m => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
        accuracy: m.accuracy,
        cost_per_1k_tokens: m.cost_per_1k_tokens
      })),
      isRedirect: false
    };
  }

  isModelRelatedQuery(query) {
    const modelKeywords = [
      'model', 'models', 'llm', 'ai', 'gpt', 'claude', 'llama', 'mistral', 'gemma',
      'accuracy', 'performance', 'cost', 'speed', 'tokens', 'inference',
      'chat', 'code', 'generation', 'classification', 'embedding', 'multimodal',
      'compare', 'comparison', 'recommend', 'recommendation', 'best', 'better',
      'evaluate', 'evaluation', 'benchmark', 'parameters', 'fine-tune',
      'transformer', 'neural', 'language model', 'nlp', 'ml', 'machine learning',
      'open source', 'commercial', 'api', 'deployment', 'training'
    ];
    
    const queryLower = query.toLowerCase();
    return modelKeywords.some(keyword => queryLower.includes(keyword));
  }

  createRedirectResponse() {
    return {
      response: `I'm VeriAI's model intelligence specialist. I focus exclusively on AI model evaluation, recommendations, and comparisons.

Try asking me:
• "Which model is best for sentiment analysis?"
• "Compare GPT-4 vs Claude-3 for coding tasks"
• "What's the most cost-effective model for text classification?"
• "Show me models with accuracy above 85%"
• "Best open-source alternative to GPT-4?"

What AI model question can I help you with?`,
      isRedirect: true
    };
  }

  async handleModelQuery(query, conversationHistory) {
    // Extract intent and entities from query
    const queryAnalysis = this.analyzeQuery(query);
    
    // Get relevant model data
    const relevantModels = this.getRelevantModels(queryAnalysis);
    
    // Generate contextual response
    const response = await this.generateModelResponse(query, queryAnalysis, relevantModels, conversationHistory);
    
    return {
      response,
      isRedirect: false,
      modelData: relevantModels,
      queryAnalysis
    };
  }

  analyzeQuery(query) {
    const queryLower = query.toLowerCase();
    
    // Extract intent
    let intent = 'general';
    if (queryLower.includes('compare') || queryLower.includes('vs') || queryLower.includes('versus')) {
      intent = 'compare';
    } else if (queryLower.includes('best') || queryLower.includes('recommend') || queryLower.includes('which')) {
      intent = 'recommend';
    } else if (queryLower.includes('cost') || queryLower.includes('price') || queryLower.includes('cheap')) {
      intent = 'cost_analysis';
    } else if (queryLower.includes('fast') || queryLower.includes('speed') || queryLower.includes('quick')) {
      intent = 'performance';
    } else if (queryLower.includes('accuracy') || queryLower.includes('quality') || queryLower.includes('performance')) {
      intent = 'accuracy';
    }
    
    // Extract use case
    let useCase = null;
    const useCases = ['chat', 'code', 'coding', 'programming', 'classification', 'sentiment', 'summarization', 
                     'translation', 'embedding', 'search', 'qa', 'question answering', 'image', 'vision', 
                     'multimodal', 'speech', 'transcription'];
    
    for (const uc of useCases) {
      if (queryLower.includes(uc)) {
        useCase = uc;
        break;
      }
    }
    
    // Extract specific models mentioned
    const mentionedModels = [];
    for (const modelId of Object.keys(TOP_50_MODELS)) {
      const model = TOP_50_MODELS[modelId];
      if (queryLower.includes(modelId) || queryLower.includes(model.name.toLowerCase())) {
        mentionedModels.push(modelId);
      }
    }
    
    // Extract constraints
    const constraints = {};
    
    // Budget constraints
    const costMatch = queryLower.match(/under \$?(\d+\.?\d*)/);
    if (costMatch) {
      constraints.maxCost = parseFloat(costMatch[1]);
    }
    
    // Accuracy constraints
    const accuracyMatch = queryLower.match(/above (\d+)%?/);
    if (accuracyMatch) {
      constraints.minAccuracy = parseFloat(accuracyMatch[1]) / 100;
    }
    
    return {
      intent,
      useCase,
      mentionedModels,
      constraints,
      original: query
    };
  }

  getRelevantModels(queryAnalysis) {
    let models = Object.values(TOP_50_MODELS);
    
    // Filter by use case if specified
    if (queryAnalysis.useCase) {
      models = models.filter(model => {
        const useCaseText = `${model.use_cases.join(' ')} ${model.category} ${model.best_for}`.toLowerCase();
        
        // Special mappings for common terms
        const useCaseMappings = {
          'sentiment': 'classification',
          'coding': 'code', 
          'programming': 'code',
          'qa': 'question answering',
          'search': 'embedding',
          'vision': 'multimodal',
          'image': 'multimodal'
        };
        
        const mappedUseCase = useCaseMappings[queryAnalysis.useCase] || queryAnalysis.useCase;
        
        return useCaseText.includes(queryAnalysis.useCase) || 
               useCaseText.includes(mappedUseCase) ||
               model.category === queryAnalysis.useCase ||
               model.category === mappedUseCase;
      });
    }
    
    // Filter by mentioned models
    if (queryAnalysis.mentionedModels.length > 0) {
      const mentionedModelData = queryAnalysis.mentionedModels.map(id => TOP_50_MODELS[id]).filter(Boolean);
      models = [...mentionedModelData, ...models.slice(0, 5)]; // Include mentioned + top 5 others
    }
    
    // Apply constraints
    if (queryAnalysis.constraints.maxCost) {
      models = models.filter(model => model.cost_per_1k_tokens <= queryAnalysis.constraints.maxCost);
    }
    
    if (queryAnalysis.constraints.minAccuracy) {
      models = models.filter(model => model.accuracy >= queryAnalysis.constraints.minAccuracy);
    }
    
    // Sort by relevance based on intent
    switch (queryAnalysis.intent) {
      case 'cost_analysis':
        models.sort((a, b) => a.cost_per_1k_tokens - b.cost_per_1k_tokens);
        break;
      case 'performance':
        models.sort((a, b) => b.speed_tokens_per_sec - a.speed_tokens_per_sec);
        break;
      case 'accuracy':
      default:
        models.sort((a, b) => b.accuracy - a.accuracy);
        break;
    }
    
    return models.slice(0, 10); // Return top 10 relevant models
  }

  async generateModelResponse(query, analysis, models, conversationHistory) {
    // Create a data-rich prompt for Gemini with our model database
    const modelDataContext = models.map(model => 
      `${model.name} (${model.provider}): ${(model.accuracy * 100).toFixed(1)}% accuracy, $${model.cost_per_1k_tokens} per 1K tokens, ${model.speed_tokens_per_sec} tokens/sec. Category: ${model.category}. Best for: ${model.best_for}. Use cases: ${model.use_cases.join(', ')}. Strengths: ${model.strengths.join(', ')}. Weaknesses: ${model.weaknesses.join(', ')}.`
    ).join('\n');

    const enhancedPrompt = `${this.systemPrompt}

CONTEXT: You have access to a comprehensive database of 50+ AI models with real performance data.

USER QUERY: "${query}"

QUERY ANALYSIS:
- Intent: ${analysis.intent}
- Use Case: ${analysis.useCase || 'general'}
- Mentioned Models: ${analysis.mentionedModels.join(', ') || 'none'}
- Constraints: ${JSON.stringify(analysis.constraints)}

RELEVANT MODEL DATA FROM DATABASE:
${modelDataContext}

INSTRUCTIONS:
1. Use the model data above to provide intelligent, nuanced responses
2. Be conversational and helpful, not just templated
3. Provide specific recommendations with clear reasoning
4. Compare models intelligently based on the user's actual needs
5. Include real metrics from the database
6. If comparing specific models, create detailed comparisons
7. Always stay focused on AI model recommendations

Generate a helpful, intelligent response using this data:`;

    try {
      // Call Gemini API with the enhanced prompt
      const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAMPK2nc3yTCzGv8UVFt_Ql-QJKmeloWV4';
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: enhancedPrompt
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        console.error(`Gemini API error: ${response.status}`);
        throw new Error(`Gemini API request failed: ${response.status}`);
      }

      const data = await response.json();
      const geminiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (geminiResponse) {
        return geminiResponse;
      } else {
        console.error('No response from Gemini API');
        throw new Error('No response from Gemini API');
      }
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      // Fallback to structured response if Gemini fails
      return this.generateStructuredResponse(analysis, models);
    }
  }

  generateStructuredResponse(analysis, models) {
    switch (analysis.intent) {
      case 'compare':
        return this.generateComparisonResponse(analysis, models);
      case 'recommend':
        return this.generateRecommendationResponse(analysis, models);
      case 'cost_analysis':
        return this.generateCostAnalysisResponse(analysis, models);
      case 'performance':
        return this.generatePerformanceResponse(analysis, models);
      case 'accuracy':
        return this.generateAccuracyResponse(analysis, models);
      default:
        return this.generateGeneralResponse(analysis, models);
    }
  }

  generateComparisonResponse(analysis, models) {
    if (analysis.mentionedModels.length >= 2) {
      const model1 = TOP_50_MODELS[analysis.mentionedModels[0]];
      const model2 = TOP_50_MODELS[analysis.mentionedModels[1]];
      
      return `## Model Comparison: ${model1.name} vs ${model2.name}

**${model1.name} (${model1.provider})**
• Accuracy: ${(model1.accuracy * 100).toFixed(1)}%
• Cost: $${model1.cost_per_1k_tokens} per 1K tokens
• Speed: ${model1.speed_tokens_per_sec} tokens/sec
• Best for: ${model1.best_for}
• Strengths: ${model1.strengths.join(', ')}

**${model2.name} (${model2.provider})**
• Accuracy: ${(model2.accuracy * 100).toFixed(1)}%
• Cost: $${model2.cost_per_1k_tokens} per 1K tokens
• Speed: ${model2.speed_tokens_per_sec} tokens/sec
• Best for: ${model2.best_for}
• Strengths: ${model2.strengths.join(', ')}

**Recommendation**: ${model1.accuracy > model2.accuracy ? model1.name : model2.name} has higher accuracy, while ${model1.cost_per_1k_tokens < model2.cost_per_1k_tokens ? model1.name : model2.name} is more cost-effective.`;
    }
    
    return this.generateGeneralResponse(analysis, models);
  }

  generateRecommendationResponse(analysis, models) {
    if (!models || models.length === 0) {
      return `## No Models Found

I couldn't find any models matching your criteria. Try:
• Asking about a different use case
• Checking your spelling of model names
• Being more specific about your requirements

Popular use cases I can help with: chat, code, classification, summarization, translation, embedding, image analysis.`;
    }
    
    const topModel = models[0];
    const alternatives = models.slice(1, 4);
    
    return `## Best Model for ${analysis.useCase || 'your needs'}: ${topModel.name}

**Top Recommendation: ${topModel.name}**
• Provider: ${topModel.provider}
• Accuracy: ${(topModel.accuracy * 100).toFixed(1)}%
• Cost: $${topModel.cost_per_1k_tokens} per 1K tokens
• Speed: ${topModel.speed_tokens_per_sec} tokens/sec
• Best for: ${topModel.best_for}

**Why this model?**
${topModel.strengths.join(', ')}

**Alternatives to consider:**
${alternatives.map(model => 
  `• **${model.name}**: ${(model.accuracy * 100).toFixed(1)}% accuracy, $${model.cost_per_1k_tokens} cost - ${model.best_for}`
).join('\n')}

Need help with specific requirements or constraints? Just ask!`;
  }

  generateCostAnalysisResponse(analysis, models) {
    const cheapest = models[0];
    const premium = models.find(m => m.accuracy > 0.9) || models[models.length - 1];
    
    return `## Cost Analysis for AI Models

**Most Cost-Effective: ${cheapest.name}**
• Cost: $${cheapest.cost_per_1k_tokens} per 1K tokens
• Accuracy: ${(cheapest.accuracy * 100).toFixed(1)}%
• Speed: ${cheapest.speed_tokens_per_sec} tokens/sec

**Premium Option: ${premium.name}**
• Cost: $${premium.cost_per_1k_tokens} per 1K tokens
• Accuracy: ${(premium.accuracy * 100).toFixed(1)}%
• Speed: ${premium.speed_tokens_per_sec} tokens/sec

**Cost Breakdown (per 1M tokens):**
${models.slice(0, 5).map(model => 
  `• ${model.name}: $${(model.cost_per_1k_tokens * 1000).toFixed(2)} (${(model.accuracy * 100).toFixed(1)}% accuracy)`
).join('\n')}

**Recommendation**: For budget-conscious applications, ${cheapest.name} offers the best value. For premium quality, consider ${premium.name}.`;
  }

  generatePerformanceResponse(analysis, models) {
    const fastest = models[0];
    
    return `## Performance Analysis: Speed-Optimized Models

**Fastest Model: ${fastest.name}**
• Speed: ${fastest.speed_tokens_per_sec} tokens/sec
• Accuracy: ${(fastest.accuracy * 100).toFixed(1)}%
• Cost: $${fastest.cost_per_1k_tokens} per 1K tokens

**Speed Rankings:**
${models.slice(0, 5).map((model, i) => 
  `${i + 1}. **${model.name}**: ${model.speed_tokens_per_sec} tokens/sec (${(model.accuracy * 100).toFixed(1)}% accuracy)`
).join('\n')}

**Performance vs Accuracy Trade-off:**
• High speed + good accuracy: ${models.find(m => m.speed_tokens_per_sec > 200 && m.accuracy > 0.8)?.name || fastest.name}
• Balanced performance: ${models.find(m => m.speed_tokens_per_sec > 100 && m.accuracy > 0.85)?.name || models[1]?.name}

Need help balancing speed, accuracy, and cost? Let me know your requirements!`;
  }

  generateAccuracyResponse(analysis, models) {
    const highest = models[0];
    
    return `## Accuracy Analysis: Top-Performing Models

**Highest Accuracy: ${highest.name}**
• Accuracy: ${(highest.accuracy * 100).toFixed(1)}%
• Provider: ${highest.provider}
• Cost: $${highest.cost_per_1k_tokens} per 1K tokens
• Best for: ${highest.best_for}

**Accuracy Rankings:**
${models.slice(0, 5).map((model, i) => 
  `${i + 1}. **${model.name}**: ${(model.accuracy * 100).toFixed(1)}% (${model.provider})`
).join('\n')}

**High-Accuracy Options by Category:**
• **Premium Commercial**: ${models.find(m => m.cost_per_1k_tokens > 0.01)?.name || highest.name} - ${(models.find(m => m.cost_per_1k_tokens > 0.01)?.accuracy * 100 || highest.accuracy * 100).toFixed(1)}%
• **Open Source**: ${models.find(m => m.tags.includes('open-source'))?.name || 'Llama-3-70B'} - High quality, self-hosted
• **Cost-Effective**: ${models.find(m => m.cost_per_1k_tokens < 0.001 && m.accuracy > 0.8)?.name || models[2]?.name} - Good balance

Want specific accuracy requirements for your use case? Just ask!`;
  }

  generateGeneralResponse(analysis, models) {
    if (!models || models.length === 0) {
      return `## AI Model Information

I specialize in AI model recommendations and comparisons. Try asking:

• "Which model is best for sentiment analysis?"
• "Compare GPT-4 vs Claude-3 for coding"
• "What's the cheapest model for text classification?"
• "Show me models with accuracy above 85%"
• "Best open-source alternative to GPT-4?"

I have detailed information about 50+ top AI models including performance metrics, costs, and use cases.`;
    }
    
    const featured = models.slice(0, 3);
    
    return `## AI Model Recommendations

**Top Models for ${analysis.useCase || 'your needs'}:**

${featured.map((model, i) => 
  `**${i + 1}. ${model.name}** (${model.provider})
• Accuracy: ${(model.accuracy * 100).toFixed(1)}%
• Cost: $${model.cost_per_1k_tokens} per 1K tokens
• Speed: ${model.speed_tokens_per_sec} tokens/sec
• Best for: ${model.best_for}`
).join('\n\n')}

**Quick Facts:**
• Most accurate: ${models[0].name} (${(models[0].accuracy * 100).toFixed(1)}%)
• Most cost-effective: ${models.sort((a, b) => a.cost_per_1k_tokens - b.cost_per_1k_tokens)[0].name}
• Fastest: ${models.sort((a, b) => b.speed_tokens_per_sec - a.speed_tokens_per_sec)[0].name}

Want me to compare specific models or help you choose based on your requirements?`;
  }
}

export default VeriAIAgent;