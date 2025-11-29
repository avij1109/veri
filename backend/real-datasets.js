import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class RealDatasetLoader {
  constructor() {
    this.datasets = {};
    this.dataPath = path.join(__dirname, 'datasets');
  }

  async loadIMDBDataset(size = 'small') {
    // IMDB Movie Reviews (Sentiment Classification)
    // In a real implementation, you'd download from HuggingFace or load from files
    const samples = [
      // Positive reviews
      { text: "This movie was absolutely fantastic! The acting was superb and the plot kept me engaged throughout.", label: "positive", dataset: "imdb" },
      { text: "One of the best films I've ever seen. Brilliant cinematography and outstanding performances.", label: "positive", dataset: "imdb" },
      { text: "Incredible storytelling with amazing character development. Highly recommended!", label: "positive", dataset: "imdb" },
      { text: "A masterpiece of cinema. Every scene was perfectly crafted and emotionally compelling.", label: "positive", dataset: "imdb" },
      { text: "Outstanding direction and phenomenal acting. This film deserves all the praise it gets.", label: "positive", dataset: "imdb" },
      
      // Negative reviews
      { text: "Terrible movie with poor acting and a confusing plot. Complete waste of time.", label: "negative", dataset: "imdb" },
      { text: "One of the worst films I've ever watched. Boring and poorly executed.", label: "negative", dataset: "imdb" },
      { text: "Awful script and terrible direction. The actors seemed bored throughout.", label: "negative", dataset: "imdb" },
      { text: "Disappointing and predictable. The plot was full of holes and made no sense.", label: "negative", dataset: "imdb" },
      { text: "Complete disaster of a movie. Poor cinematography and wooden performances.", label: "negative", dataset: "imdb" }
    ];

    const sizeMap = { small: 10, medium: 20, large: 50 };
    const targetSize = Math.min(samples.length, sizeMap[size] || 10);
    
    return {
      name: 'IMDB Movie Reviews',
      task: 'sentiment-analysis',
      samples: samples.slice(0, targetSize),
      labels: ['positive', 'negative'],
      source: 'imdb'
    };
  }

  async loadAGNewsDataset(size = 'small') {
    // AG News (Topic Classification)
    const samples = [
      { text: "Apple Inc. reported record quarterly earnings driven by strong iPhone sales in emerging markets.", label: "business", dataset: "ag_news" },
      { text: "The Federal Reserve announced a new monetary policy to combat rising inflation rates.", label: "business", dataset: "ag_news" },
      { text: "Congress passed landmark legislation addressing climate change and renewable energy investments.", label: "politics", dataset: "ag_news" },
      { text: "Presidential election polls show tight race between leading candidates in key swing states.", label: "politics", dataset: "ag_news" },
      { text: "Scientists discover new exoplanet potentially habitable for human life in distant galaxy.", label: "science", dataset: "ag_news" },
      { text: "Breakthrough in quantum computing brings us closer to solving complex mathematical problems.", label: "science", dataset: "ag_news" },
      { text: "Local basketball team wins championship after defeating rivals in overtime thriller game.", label: "sports", dataset: "ag_news" },
      { text: "Olympic athlete breaks world record in swimming competition at international tournament.", label: "sports", dataset: "ag_news" }
    ];

    const sizeMap = { small: 8, medium: 16, large: 40 };
    const targetSize = Math.min(samples.length, sizeMap[size] || 8);
    
    return {
      name: 'AG News Classification',
      task: 'text-classification',
      samples: samples.slice(0, targetSize),
      labels: ['business', 'politics', 'science', 'sports'],
      source: 'ag_news'
    };
  }

  async loadSST2Dataset(size = 'small') {
    // Stanford Sentiment Treebank (Binary Sentiment)
    const samples = [
      { text: "The movie is absolutely brilliant and entertaining.", label: "positive", dataset: "sst2" },
      { text: "A remarkable film with outstanding performances.", label: "positive", dataset: "sst2" },
      { text: "This is a terrible and boring movie.", label: "negative", dataset: "sst2" },
      { text: "Disappointing and poorly executed film.", label: "negative", dataset: "sst2" },
      { text: "Exceptional storytelling and great acting.", label: "positive", dataset: "sst2" },
      { text: "Awful script with terrible direction.", label: "negative", dataset: "sst2" }
    ];

    const sizeMap = { small: 6, medium: 12, large: 30 };
    const targetSize = Math.min(samples.length, sizeMap[size] || 6);
    
    return {
      name: 'Stanford Sentiment Treebank',
      task: 'sentiment-analysis', 
      samples: samples.slice(0, targetSize),
      labels: ['positive', 'negative'],
      source: 'sst2'
    };
  }

  async loadCustomDataset(datasetName, filePath) {
    // Load custom dataset from JSON file
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const dataset = JSON.parse(data);
      
      return {
        name: datasetName,
        task: dataset.task || 'text-classification',
        samples: dataset.samples || [],
        labels: dataset.labels || [],
        source: 'custom'
      };
    } catch (error) {
      console.error(`Failed to load custom dataset ${datasetName}:`, error);
      return null;
    }
  }

  async getAvailableDatasets() {
    return [
      { name: 'IMDB Movie Reviews', id: 'imdb', task: 'sentiment-analysis', size: 10 },
      { name: 'AG News Classification', id: 'ag_news', task: 'text-classification', size: 8 },
      { name: 'Stanford Sentiment Treebank', id: 'sst2', task: 'sentiment-analysis', size: 6 }
    ];
  }

  async loadDataset(datasetId, size = 'small') {
    switch (datasetId) {
      case 'imdb':
        return await this.loadIMDBDataset(size);
      case 'ag_news':
        return await this.loadAGNewsDataset(size);
      case 'sst2':
        return await this.loadSST2Dataset(size);
      default:
        throw new Error(`Unknown dataset: ${datasetId}`);
    }
  }

  createKFoldSplits(dataset, k = 5) {
    const splits = [];
    const samples = [...dataset.samples];
    
    // For very small datasets, reduce k to ensure each fold has test samples
    const effectiveK = Math.min(k, samples.length);
    
    // Shuffle samples with fixed seed for reproducibility
    const shuffled = this.shuffleWithSeed(samples, 42);
    
    const foldSize = Math.floor(shuffled.length / effectiveK);
    const remainder = shuffled.length % effectiveK;
    
    for (let i = 0; i < effectiveK; i++) {
      // Distribute remainder samples across first few folds
      const extraSample = i < remainder ? 1 : 0;
      const testStart = i * foldSize + Math.min(i, remainder);
      const testEnd = testStart + foldSize + extraSample;
      
      const testSet = shuffled.slice(testStart, testEnd);
      const trainSet = [...shuffled.slice(0, testStart), ...shuffled.slice(testEnd)];
      
      splits.push({ 
        train: trainSet, 
        test: testSet,
        fold: i + 1,
        trainSize: trainSet.length,
        testSize: testSet.length
      });
    }
    
    return splits;
  }

  // Stratified sampling to maintain label distribution
  createStratifiedSplits(dataset, k = 5) {
    const labelGroups = {};
    dataset.samples.forEach(sample => {
      if (!labelGroups[sample.label]) {
        labelGroups[sample.label] = [];
      }
      labelGroups[sample.label].push(sample);
    });

    // For very small datasets, reduce k to ensure viable splits
    const minSamplesPerLabel = Math.min(...Object.values(labelGroups).map(group => group.length));
    const effectiveK = Math.min(k, minSamplesPerLabel, dataset.samples.length);
    
    if (effectiveK < 2) {
      console.warn(`Dataset too small for stratified k-fold, using simple split`);
      return this.createKFoldSplits(dataset, 2);
    }

    const splits = Array.from({ length: effectiveK }, (_, i) => ({
      train: [],
      test: [],
      fold: i + 1,
      trainSize: 0,
      testSize: 0
    }));

    // Distribute each label's samples across folds
    Object.values(labelGroups).forEach(labelSamples => {
      const shuffled = this.shuffleWithSeed(labelSamples, 42);
      const foldSize = Math.floor(shuffled.length / effectiveK);
      const remainder = shuffled.length % effectiveK;

      for (let i = 0; i < effectiveK; i++) {
        const extraSample = i < remainder ? 1 : 0;
        const testStart = i * foldSize + Math.min(i, remainder);
        const testEnd = testStart + foldSize + extraSample;
        
        const testSamples = shuffled.slice(testStart, testEnd);
        const trainSamples = [...shuffled.slice(0, testStart), ...shuffled.slice(testEnd)];
        
        splits[i].test.push(...testSamples);
        splits[i].train.push(...trainSamples);
      }
    });

    // Update sizes and ensure all folds have test samples
    splits.forEach((split, index) => {
      split.trainSize = split.train.length;
      split.testSize = split.test.length;
      
      if (split.testSize === 0) {
        console.warn(`Fold ${index + 1} has no test samples, moving one from train`);
        if (split.train.length > 0) {
          const movedSample = split.train.pop();
          split.test.push(movedSample);
          split.trainSize = split.train.length;
          split.testSize = split.test.length;
        }
      }
    });

    return splits;
  }

  shuffleWithSeed(array, seed = 42) {
    const shuffled = [...array];
    let random = this.seededRandom(seed);
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }

  seededRandom(seed) {
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  // Stratified sampling to maintain label distribution
  createStratifiedSplits(dataset, k = 5) {
    const labelGroups = {};
    dataset.samples.forEach(sample => {
      if (!labelGroups[sample.label]) {
        labelGroups[sample.label] = [];
      }
      labelGroups[sample.label].push(sample);
    });

    const splits = Array.from({ length: k }, (_, i) => ({
      train: [],
      test: [],
      fold: i + 1,
      trainSize: 0,
      testSize: 0
    }));

    // Distribute each label's samples across folds
    Object.values(labelGroups).forEach(labelSamples => {
      const shuffled = this.shuffleWithSeed(labelSamples, 42);
      const foldSize = Math.floor(shuffled.length / k);

      for (let i = 0; i < k; i++) {
        const testStart = i * foldSize;
        const testEnd = (i === k - 1) ? shuffled.length : (i + 1) * foldSize;
        
        const testSamples = shuffled.slice(testStart, testEnd);
        const trainSamples = [...shuffled.slice(0, testStart), ...shuffled.slice(testEnd)];
        
        splits[i].test.push(...testSamples);
        splits[i].train.push(...trainSamples);
      }
    });

    // Update sizes
    splits.forEach(split => {
      split.trainSize = split.train.length;
      split.testSize = split.test.length;
    });

    return splits;
  }
}

export default RealDatasetLoader;