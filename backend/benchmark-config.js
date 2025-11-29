export const BENCHMARK_CONFIG = {
  // Evaluation metrics configuration
  metrics: {
    'text-classification': {
      primary: ['accuracy'],
      secondary: ['precision', 'recall', 'f1_score']
    },
    'sentiment-analysis': {
      primary: ['accuracy'],
      secondary: ['precision', 'recall', 'f1_score']
    },
    'text-generation': {
      primary: ['bleu_score'],
      secondary: ['rouge_score', 'avg_length']
    },
    'question-answering': {
      primary: ['accuracy'],
      secondary: ['exact_match', 'f1_score']
    }
  },

  // Cross-validation settings
  crossValidation: {
    kFolds: 5,
    shuffle: true,
    randomState: 42
  },

  // Baseline models for comparison
  baselines: {
    'text-classification': ['random', 'majority_class'],
    'sentiment-analysis': ['random', 'majority_class'],
    'text-generation': ['random'],
    'question-answering': ['random', 'majority_class']
  },

  // Performance thresholds for each task type
  performanceThresholds: {
    'text-classification': {
      excellent: 0.90,
      good: 0.80,
      acceptable: 0.70
    },
    'sentiment-analysis': {
      excellent: 0.85,
      good: 0.75,
      acceptable: 0.65
    },
    'text-generation': {
      excellent: 0.40,  // BLEU scores are typically lower
      good: 0.25,
      acceptable: 0.15
    },
    'question-answering': {
      excellent: 0.85,
      good: 0.75,
      acceptable: 0.65
    }
  },

  // Test dataset sizes
  datasetSizes: {
    small: 30,
    medium: 50,
    large: 100
  }
};
