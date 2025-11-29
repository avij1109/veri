import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Star, TrendingUp, DollarSign, Clock, Mail, Smartphone, Eye, BarChart3, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import Navigation from '@/components/Navigation';

interface Model {
  id: string;
  name: string;
  provider: string;
  category: string;
  parameters: string;
  accuracy: number;
  cost_per_1k_tokens: number;
  speed_tokens_per_sec: number;
  use_cases: string[];
  strengths: string[];
  weaknesses: string[];
  best_for: string;
  evaluatedAt: string;
  tags: string[];
}

interface WatchedModel {
  model: Model;
  addedAt: Date;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

const Watcher = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [watchedModels, setWatchedModels] = useState<WatchedModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [showModelDetails, setShowModelDetails] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [allModels, setAllModels] = useState<Model[]>([]);
  const [searchResults, setSearchResults] = useState<Model[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch all models on component mount
  useEffect(() => {
    const fetchAllModels = async () => {
      try {
        console.log('Fetching models from API...');
        const response = await fetch('http://localhost:5000/api/models?limit=50');
        console.log('API response status:', response.status);
        const data = await response.json();
        console.log('API response data:', data);
        
        if (data.models && Array.isArray(data.models)) {
          console.log('Setting models:', data.models.length, 'models found');
          setAllModels(data.models);
        } else {
          console.warn('Invalid API response structure:', data);
        }
      } catch (error) {
        console.error('Error fetching models:', error);
        // Fallback to some mock data if API fails
        console.log('Using fallback mock data');
        setAllModels([
          {
            id: 'gpt-4',
            name: 'GPT-4',
            provider: 'OpenAI',
            category: 'chat',
            parameters: '1.76T',
            accuracy: 0.92,
            cost_per_1k_tokens: 0.03,
            speed_tokens_per_sec: 50,
            use_cases: ['chat', 'reasoning', 'creative writing', 'code assistance'],
            strengths: ['Superior reasoning', 'Multimodal capabilities'],
            weaknesses: ['Expensive', 'Slower inference'],
            best_for: 'Complex reasoning and high-quality responses',
            evaluatedAt: '2024-09-10',
            tags: ['premium', 'reasoning', 'multimodal']
          },
          {
            id: 'gpt-3.5-turbo',
            name: 'GPT-3.5 Turbo',
            provider: 'OpenAI',
            category: 'chat',
            parameters: '175B',
            accuracy: 0.85,
            cost_per_1k_tokens: 0.001,
            speed_tokens_per_sec: 150,
            use_cases: ['chat', 'content generation', 'simple coding'],
            strengths: ['Fast', 'Cost-effective'],
            weaknesses: ['Less capable than GPT-4'],
            best_for: 'High-volume applications',
            evaluatedAt: '2024-09-08',
            tags: ['fast', 'cost-effective', 'popular']
          }
        ]);
      }
    };

    fetchAllModels();
  }, []);

  // Search models locally with debouncing
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      setIsSearching(true);
      
      const filtered = allModels.filter(model => {
        const searchLower = searchQuery.toLowerCase();
        return (
          model.name.toLowerCase().includes(searchLower) ||
          model.provider.toLowerCase().includes(searchLower) ||
          model.category.toLowerCase().includes(searchLower) ||
          model.use_cases.some(useCase => useCase.toLowerCase().includes(searchLower)) ||
          model.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
          model.best_for.toLowerCase().includes(searchLower)
        );
      });

      setSearchResults(filtered.slice(0, 8)); // Limit to 8 results
      setShowDropdown(true);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, allModels]);

  // Generate AI summary for model
  const generateModelSummary = (model: Model): string => {
    const betterOptions = allModels
      .filter(m => m.id !== model.id && m.category === model.category && m.cost_per_1k_tokens < model.cost_per_1k_tokens)
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 2);

    const benchmarkScore = Math.round(model.accuracy * 100);
    const trustScore = Math.round((benchmarkScore * 0.6) + (Math.random() * 40)); // Mock trust score

    return `
📊 **${model.name} Analysis Summary**

**Overview**: ${model.name} by ${model.provider} is a ${model.category} model with ${model.parameters} parameters, achieving ${(model.accuracy * 100).toFixed(1)}% accuracy.

**💰 Pricing**: $${model.cost_per_1k_tokens.toFixed(4)} per 1K tokens
- **Performance Tier**: ${model.cost_per_1k_tokens > 0.01 ? 'Premium' : model.cost_per_1k_tokens > 0.001 ? 'Standard' : 'Budget'}
- **Speed**: ${model.speed_tokens_per_sec} tokens/sec

**🔧 Best Use Cases**: ${model.use_cases.slice(0, 3).join(', ')}

**⚡ Strengths**: ${model.strengths.slice(0, 2).join(', ')}
**⚠️ Limitations**: ${model.weaknesses.slice(0, 2).join(', ')}

**📈 Scores**:
- **Benchmark Score**: ${benchmarkScore}/100
- **Trust Score**: ${trustScore}/100 (${Math.floor(Math.random() * 50)} community ratings)

**💡 Better Value Alternatives**:
${betterOptions.length > 0 ? 
  betterOptions.map(alt => 
    `• ${alt.name} - $${alt.cost_per_1k_tokens.toFixed(4)}/1K tokens (${(alt.accuracy * 100).toFixed(1)}% accuracy)`
  ).join('\n') : 
  'No cheaper alternatives with comparable performance found.'
}

**🎯 Recommendation**: ${model.best_for}
    `.trim();
  };

  const addToWatchlist = (model: Model) => {
    // Check if already in watchlist
    if (watchedModels.some(w => w.model.id === model.id)) {
      return;
    }

    const newWatchedModel: WatchedModel = {
      model,
      addedAt: new Date(),
      emailNotifications,
      smsNotifications
    };
    
    setWatchedModels(prev => [...prev, newWatchedModel]);
    setSelectedModel(model);
    setShowModelDetails(true);
    setSearchQuery(''); // Clear search
    setShowDropdown(false); // Hide dropdown
  };

  const removeFromWatchlist = (modelId: string) => {
    setWatchedModels(prev => prev.filter(wm => wm.model.id !== modelId));
    if (selectedModel?.id === modelId) {
      setShowModelDetails(false);
      setSelectedModel(null);
    }
  };

  const updateNotificationSettings = (modelId: string, email: boolean, sms: boolean) => {
    setWatchedModels(prev => prev.map(wm => 
      wm.model.id === modelId 
        ? { ...wm, emailNotifications: email, smsNotifications: sms }
        : wm
    ));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">
              Model <span className="text-gradient">Watcher</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-6">
              Track, analyze, and get notifications about your favorite AI models
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Search and Watchlist Panel */}
            <div className="lg:col-span-1 space-y-6">
              {/* Search Bar */}
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Search className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Search Models</h3>
                  </div>
                  
                  <div className="relative">
                    <Input
                      placeholder="Search models, providers, or use cases..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => searchQuery && setShowDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                      className="pr-10"
                    />
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    
                    {/* Search Dropdown */}
                    {showDropdown && searchQuery && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                        {isSearching ? (
                          <div className="p-4 text-center text-muted-foreground">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                              <span>Searching models...</span>
                            </div>
                          </div>
                        ) : searchResults.length > 0 ? (
                          <div className="py-2">
                            {searchResults.map(model => (
                              <div
                                key={model.id}
                                className="px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors border-b border-muted/20 last:border-b-0"
                                onClick={() => {
                                  addToWatchlist(model);
                                  setShowDropdown(false);
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className="font-medium text-sm">{model.name}</span>
                                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                        {model.provider}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground mb-2">
                                      {model.best_for}
                                    </div>
                                    <div className="flex space-x-3 text-xs text-muted-foreground">
                                      <span className="flex items-center">
                                        <BarChart3 className="h-3 w-3 mr-1" />
                                        {(model.accuracy * 100).toFixed(0)}%
                                      </span>
                                      <span className="flex items-center">
                                        <DollarSign className="h-3 w-3 mr-1" />
                                        ${model.cost_per_1k_tokens}/1K
                                      </span>
                                      <span className="flex items-center">
                                        <Zap className="h-3 w-3 mr-1" />
                                        {model.speed_tokens_per_sec}/s
                                      </span>
                                    </div>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant={watchedModels.some(w => w.model.id === model.id) ? "secondary" : "outline"}
                                    disabled={watchedModels.some(w => w.model.id === model.id)}
                                    className="ml-3"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!watchedModels.some(w => w.model.id === model.id)) {
                                        addToWatchlist(model);
                                      }
                                      setShowDropdown(false);
                                    }}
                                  >
                                    {watchedModels.some(w => w.model.id === model.id) ? (
                                      <Eye className="h-3 w-3" />
                                    ) : (
                                      <Plus className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-muted-foreground">
                            <div className="flex flex-col items-center space-y-2">
                              <Search className="h-8 w-8 text-muted-foreground/50" />
                              <span>No models found matching "{searchQuery}"</span>
                              <span className="text-xs">Try searching for GPT, Claude, or LLaMA</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Watchlist */}
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Eye className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold">Watchlist</h3>
                    </div>
                    <Badge variant="secondary">{watchedModels.length}</Badge>
                  </div>

                  {watchedModels.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No models in your watchlist yet.</p>
                      <p className="text-sm">Search and add models to start tracking them.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {watchedModels.map(watchedModel => (
                        <div
                          key={watchedModel.model.id}
                          className={`p-3 border border-border rounded-lg cursor-pointer transition-colors ${
                            selectedModel?.id === watchedModel.model.id ? 'bg-electric/10 border-electric' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => {
                            setSelectedModel(watchedModel.model);
                            setShowModelDetails(true);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium">{watchedModel.model.name}</div>
                              <div className="text-sm text-muted-foreground">{watchedModel.model.provider}</div>
                              <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center space-x-1">
                                  <TrendingUp className="h-3 w-3" />
                                  <span>{(watchedModel.model.accuracy * 100).toFixed(1)}%</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <DollarSign className="h-3 w-3" />
                                  <span>${watchedModel.model.cost_per_1k_tokens.toFixed(4)}</span>
                                </span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromWatchlist(watchedModel.model.id);
                              }}
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Model Details Panel */}
            <div className="lg:col-span-2">
              {showModelDetails && selectedModel ? (
                <Card className="p-6">
                  <div className="space-y-6">
                    {/* Model Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-2xl font-bold">{selectedModel.name}</h2>
                        <p className="text-muted-foreground">{selectedModel.provider}</p>
                        <div className="flex space-x-2 mt-2">
                          {selectedModel.tags.map(tag => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Badge className="bg-electric/10 text-electric border-electric">
                        {selectedModel.category}
                      </Badge>
                    </div>

                    <Separator />

                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="p-4 bg-green-50 border-green-200">
                        <div className="flex items-center space-x-2">
                          <BarChart3 className="h-5 w-5 text-green-600" />
                          <div>
                            <div className="text-sm text-green-600">Accuracy</div>
                            <div className="text-xl font-bold text-green-700">
                              {(selectedModel.accuracy * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-4 bg-blue-50 border-blue-200">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-5 w-5 text-blue-600" />
                          <div>
                            <div className="text-sm text-blue-600">Cost per 1K tokens</div>
                            <div className="text-xl font-bold text-blue-700">
                              ${selectedModel.cost_per_1k_tokens.toFixed(4)}
                            </div>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-4 bg-purple-50 border-purple-200">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-5 w-5 text-purple-600" />
                          <div>
                            <div className="text-sm text-purple-600">Speed</div>
                            <div className="text-xl font-bold text-purple-700">
                              {selectedModel.speed_tokens_per_sec} tokens/s
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* AI-Generated Summary */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Zap className="h-5 w-5 text-electric" />
                        <h3 className="text-lg font-semibold">AI Analysis</h3>
                      </div>
                      
                      <Card className="p-4 bg-muted/30">
                        <pre className="whitespace-pre-wrap text-sm font-mono">
                          {generateModelSummary(selectedModel)}
                        </pre>
                      </Card>
                    </div>

                    <Separator />

                    {/* Notification Settings */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Notification Preferences</h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id="email-notifications"
                            checked={emailNotifications}
                            onCheckedChange={(checked) => {
                              setEmailNotifications(checked as boolean);
                              updateNotificationSettings(selectedModel.id, checked as boolean, smsNotifications);
                            }}
                          />
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <label htmlFor="email-notifications" className="text-sm font-medium">
                              Email updates about model performance, pricing changes, and new versions
                            </label>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id="sms-notifications"
                            checked={smsNotifications}
                            onCheckedChange={(checked) => {
                              setSmsNotifications(checked as boolean);
                              updateNotificationSettings(selectedModel.id, emailNotifications, checked as boolean);
                            }}
                          />
                          <div className="flex items-center space-x-2">
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                            <label htmlFor="sms-notifications" className="text-sm font-medium">
                              SMS alerts for critical updates and outages
                            </label>
                          </div>
                        </div>
                      </div>

                      <Alert>
                        <AlertDescription>
                          You'll receive notifications when there are significant changes in performance, 
                          pricing updates, new model versions, or service disruptions.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="p-12 text-center">
                  <div className="space-y-4">
                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                      <Search className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Select a Model to Analyze</h3>
                      <p className="text-muted-foreground">
                        Search for AI models and add them to your watchlist to see detailed analysis, 
                        pricing comparisons, and performance insights.
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Watcher;