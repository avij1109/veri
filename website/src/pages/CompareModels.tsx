import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Plus, Loader2, BarChart3, CheckCircle, AlertCircle } from 'lucide-react';
import Navigation from '@/components/Navigation';

interface ModelConfig {
  id: string;
  name: string;
  apiKey: string;
}

interface ComparisonResult {
  modelName: string;
  output: string;
  qualityMetrics: {
    fluency: number;
    coherence: number;
    safety: number;
    confidence: number;
  };
  agreementScore: number;
  trustScore: number;
}

interface ComparisonData {
  prompt: string;
  results: ComparisonResult[];
  consensusAnalysis: {
    agreement: number;
    outliers: string[];
    recommendation: string;
  };
}

const CompareModels = () => {
  const [models, setModels] = useState<ModelConfig[]>([
    { id: '1', name: '', apiKey: '' }
  ]);
  const [testPrompt, setTestPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [error, setError] = useState('');

  const addModel = () => {
    if (models.length < 5) {
      setModels([...models, { 
        id: Date.now().toString(), 
        name: '', 
        apiKey: '' 
      }]);
    }
  };

  const removeModel = (id: string) => {
    if (models.length > 1) {
      setModels(models.filter(model => model.id !== id));
    }
  };

  const updateModel = (id: string, field: 'name' | 'apiKey', value: string) => {
    setModels(models.map(model => 
      model.id === id ? { ...model, [field]: value } : model
    ));
  };

  const runComparison = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const validModels = models.filter(m => m.name.trim() && m.apiKey.trim());
      
      if (validModels.length < 2) {
        throw new Error('Please provide at least 2 models with valid names and API keys');
      }
      
      if (!testPrompt.trim()) {
        throw new Error('Please provide a test prompt');
      }

      const response = await fetch('http://localhost:5000/api/models/compare-outputs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          models: validModels,
          prompt: testPrompt
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to compare models: ${response.status}`);
      }

      const data = await response.json();
      setComparisonData(data);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/50">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-gradient">Compare Models</h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Compare up to 5 AI models side-by-side with intelligent analysis including 
              agreement scores, quality metrics, and benchmark trust scores.
            </p>
          </div>

          {/* Model Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Model Configuration
              </CardTitle>
              <CardDescription>
                Add up to 5 models to compare. Provide model names and API keys for each.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {models.map((model, index) => (
                <div key={model.id} className="flex gap-4 p-4 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Model {index + 1}</span>
                      {models.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeModel(model.id)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        placeholder="Model name (e.g., gpt-4, claude-3-sonnet)"
                        value={model.name}
                        onChange={(e) => updateModel(model.id, 'name', e.target.value)}
                      />
                      <Input
                        type="password"
                        placeholder="API Key"
                        value={model.apiKey}
                        onChange={(e) => updateModel(model.id, 'apiKey', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {models.length < 5 && (
                <Button
                  variant="outline"
                  onClick={addModel}
                  className="w-full border-dashed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Model (max 5)
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Test Prompt */}
          <Card>
            <CardHeader>
              <CardTitle>Test Prompt</CardTitle>
              <CardDescription>
                Enter the prompt you want to test across all models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter your test prompt here... (e.g., 'Explain quantum computing in simple terms')"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                rows={4}
                className="min-h-[120px]"
              />
            </CardContent>
          </Card>

          {/* Run Comparison */}
          <div className="flex justify-center">
            <Button
              onClick={runComparison}
              disabled={isLoading}
              size="lg"
              className="btn-hero min-w-[200px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Comparing Models...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Run Comparison
                </>
              )}
            </Button>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {comparisonData && (
            <div className="space-y-6">
              {/* Consensus Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Consensus Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-electric mb-2">
                        {comparisonData.consensusAnalysis.agreement}%
                      </div>
                      <div className="text-sm text-muted-foreground">Agreement Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-500 mb-2">
                        {comparisonData.consensusAnalysis.outliers.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Outliers Detected</div>
                    </div>
                    <div className="text-center">
                      <Badge className="text-lg px-4 py-2">
                        Recommended: {comparisonData.consensusAnalysis.recommendation}
                      </Badge>
                    </div>
                  </div>
                  
                  {comparisonData.consensusAnalysis.outliers.length > 0 && (
                    <Alert className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Outliers detected:</strong> {comparisonData.consensusAnalysis.outliers.join(', ')} 
                        - These models produced significantly different outputs.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Individual Results */}
              <div className="grid gap-6">
                <h3 className="text-2xl font-semibold">Individual Model Results</h3>
                {comparisonData.results.map((result, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{result.modelName}</CardTitle>
                        <div className="flex gap-2">
                          <Badge className={getScoreBadge(result.agreementScore)}>
                            Agreement: {result.agreementScore}%
                          </Badge>
                          <Badge className={getScoreBadge(result.trustScore)}>
                            Trust: {result.trustScore}%
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Output */}
                      <div>
                        <h4 className="font-medium mb-2">Generated Output:</h4>
                        <div className="p-3 bg-muted rounded-md text-sm">
                          {result.output}
                        </div>
                      </div>

                      {/* Quality Metrics */}
                      <div>
                        <h4 className="font-medium mb-3">Quality Metrics:</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${getScoreColor(result.qualityMetrics.fluency)}`}>
                              {result.qualityMetrics.fluency}%
                            </div>
                            <div className="text-xs text-muted-foreground">Fluency</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${getScoreColor(result.qualityMetrics.coherence)}`}>
                              {result.qualityMetrics.coherence}%
                            </div>
                            <div className="text-xs text-muted-foreground">Coherence</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${getScoreColor(result.qualityMetrics.safety)}`}>
                              {result.qualityMetrics.safety}%
                            </div>
                            <div className="text-xs text-muted-foreground">Safety</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${getScoreColor(result.qualityMetrics.confidence)}`}>
                              {result.qualityMetrics.confidence}%
                            </div>
                            <div className="text-xs text-muted-foreground">Confidence</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompareModels;