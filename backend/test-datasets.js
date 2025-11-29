const TEST_DATASETS = {
  "text-classification": [
    { text: "I absolutely love this product! It's amazing!", label: "positive", category: "product_review" },
    { text: "This is the worst thing I've ever bought", label: "negative", category: "product_review" },
    { text: "The movie was fantastic and entertaining", label: "positive", category: "movie_review" },
    { text: "Boring and poorly written script", label: "negative", category: "movie_review" },
    { text: "Great customer service and fast delivery", label: "positive", category: "service_review" },
    { text: "Terrible experience, would not recommend", label: "negative", category: "service_review" },
    { text: "This book is incredibly insightful and well-written", label: "positive", category: "book_review" },
    { text: "Confusing plot and poor character development", label: "negative", category: "book_review" },
    { text: "The weather is nice today", label: "neutral", category: "general" },
    { text: "I need to buy groceries", label: "neutral", category: "general" },
    { text: "Outstanding performance and excellent quality", label: "positive", category: "general" },
    { text: "Completely disappointed with the results", label: "negative", category: "general" },
    { text: "The food was delicious and fresh", label: "positive", category: "food_review" },
    { text: "Cold food and poor service", label: "negative", category: "food_review" },
    { text: "Perfect for my needs, highly recommended", label: "positive", category: "recommendation" },
    { text: "Not worth the money, look elsewhere", label: "negative", category: "recommendation" }
  ],
  
  "text-generation": [
    { 
      prompt: "The future of artificial intelligence is", 
      expected_keywords: ["technology", "innovation", "advancement", "machine learning", "automation", "progress"],
      reference_text: "bright and full of technological possibilities that will transform how we work, learn, and live through innovative machine learning systems.",
      category: "technology",
      min_length: 10
    },
    { 
      prompt: "Climate change is a serious issue because", 
      expected_keywords: ["environment", "global warming", "sustainability", "future", "planet", "impact"],
      reference_text: "it threatens our planet's environmental stability and requires urgent global action to prevent catastrophic impacts on future generations.",
      category: "environment",
      min_length: 15
    },
    { 
      prompt: "The benefits of renewable energy include", 
      expected_keywords: ["clean", "sustainable", "environment", "solar", "wind", "green"],
      reference_text: "cleaner environmental impact, sustainable power generation, and reduced dependence on fossil fuels through solar, wind, and other green technologies.",
      category: "energy",
      min_length: 12
    },
    { 
      prompt: "Machine learning algorithms can", 
      expected_keywords: ["predict", "analyze", "learn", "data", "pattern", "accuracy"],
      reference_text: "analyze large datasets, learn from patterns, make accurate predictions, and continuously improve their performance through data-driven insights.",
      category: "technology",
      min_length: 10
    },
    { 
      prompt: "The importance of education is", 
      expected_keywords: ["knowledge", "learning", "development", "skills", "future", "growth"],
      reference_text: "fundamental for personal growth, knowledge development, skill building, and creating opportunities for a better future.",
      category: "education",
      min_length: 10
    },
    { 
      prompt: "Space exploration helps humanity by", 
      expected_keywords: ["discovery", "technology", "knowledge", "science", "innovation", "future"],
      category: "science",
      min_length: 12
    },
    { 
      prompt: "Healthy eating habits include", 
      expected_keywords: ["nutrition", "vegetables", "fruits", "balanced", "vitamins", "wellness"],
      category: "health",
      min_length: 8
    },
    { 
      prompt: "The digital revolution has transformed", 
      expected_keywords: ["technology", "communication", "internet", "innovation", "society", "change"],
      category: "technology",
      min_length: 10
    }
  ],
  
  "summarization": [
    {
      text: "Artificial intelligence (AI) is transforming industries across the globe. From healthcare to finance, AI technologies are improving efficiency, reducing costs, and creating new opportunities. Machine learning algorithms can analyze vast amounts of data to identify patterns and make predictions. Natural language processing enables computers to understand and generate human language. Computer vision allows machines to interpret visual information. As AI continues to advance, it will likely play an increasingly important role in our daily lives, though it also raises important questions about ethics, privacy, and the future of work.",
      expected_keywords: ["AI", "transforming", "industries", "machine learning", "efficiency", "technology"],
      category: "technology"
    },
    {
      text: "Climate change is one of the most pressing challenges of our time. Rising global temperatures are causing ice caps to melt, sea levels to rise, and weather patterns to become more extreme. The primary cause is the emission of greenhouse gases from human activities, particularly the burning of fossil fuels. To address this crisis, countries around the world are implementing policies to reduce emissions, invest in renewable energy, and adapt to changing conditions. Individual actions, such as reducing energy consumption and supporting sustainable practices, also play a crucial role in combating climate change.",
      expected_keywords: ["climate change", "global temperatures", "greenhouse gases", "renewable energy", "emissions"],
      category: "environment"
    }
  ],
  
  "text2text-generation": [
    {
      input_text: "translate English to French: Hello, how are you?",
      expected_keywords: ["bonjour", "comment", "allez"],
      category: "translation"
    },
    {
      input_text: "summarize: The quick brown fox jumps over the lazy dog. This is a common English pangram used to test typewriters and keyboards.",
      expected_keywords: ["fox", "dog", "pangram", "typewriter"],
      category: "summarization"
    },
    {
      input_text: "question: What is the capital of France? context: France is a country in Europe with many beautiful cities including Paris, Lyon, and Marseille.",
      expected_keywords: ["Paris"],
      category: "question_answering"
    }
  ]
};

export default TEST_DATASETS;