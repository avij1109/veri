import { Code, Book, Zap, Globe, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

const APISection = () => {
  const codeExample = `import veriai

# Get instant model performance
result = veriai.evaluate("meta-llama/llama-2-70b-chat")
print(f"Accuracy: {result.accuracy}%")
print(f"EU AI Act Score: {result.compliance.eu_ai_act}/10")
print(f"Cost per 1M tokens: $\{result.cost_estimate}")

# Output:
# Accuracy: 94.2%
# EU AI Act Score: 8/10
# Cost per 1M tokens: $2.50`;

  const features = [
    {
      icon: Zap,
      title: "RESTful endpoints",
      description: "Clean, intuitive REST API design"
    },
    {
      icon: Clock,
      title: "Rate limiting: 1000 requests/hour",
      description: "Generous limits for development and production"
    },
    {
      icon: Globe,
      title: "Real-time webhooks",
      description: "Get notified of model updates instantly"
    },
    {
      icon: Book,
      title: "Comprehensive documentation",
      description: "Detailed guides, examples, and references"
    },
    {
      icon: Code,
      title: "SDKs available",
      description: "Python, Node.js, and more coming soon"
    },
    {
      icon: Shield,
      title: "Enterprise security",
      description: "API keys, rate limiting, and audit logs"
    }
  ];

  return (
    <section id="api" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            <span className="text-gradient">Developer-First</span> Platform
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Integrate VeriAI into your workflow with our powerful, well-documented API
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Code Example */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold">Quick Start Example</h3>
            
            <div className="card-elevated p-6 bg-card/50 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Code className="h-5 w-5 text-electric" />
                  <span className="font-medium">Python SDK</span>
                </div>
                <Button variant="outline" size="sm">
                  Copy Code
                </Button>
              </div>
              
              <pre className="text-sm overflow-x-auto">
                <code className="text-muted-foreground whitespace-pre-wrap font-mono">
                  {codeExample}
                </code>
              </pre>
            </div>

            {/* Installation */}
            <div className="space-y-4">
              <h4 className="font-semibold">Installation</h4>
              <div className="card-elevated p-4 bg-card/50">
                <code className="text-sm font-mono">pip install veriai-python</code>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button className="btn-hero">
                View Full Documentation
              </Button>
              <Button variant="outline" className="btn-outline">
                Download SDK
              </Button>
            </div>
          </div>

          {/* API Features */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold">API Features</h3>
            
            <div className="grid gap-4">
              {features.map((feature, index) => (
                <div key={index} className="card-elevated p-6 flex items-start space-x-4">
                  <div className="w-10 h-10 bg-electric/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-5 w-5 text-electric" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">{feature.title}</h4>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* API Stats */}
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="text-center p-4 card-gradient rounded-lg">
                <div className="text-2xl font-bold text-electric">99.9%</div>
                <div className="text-sm text-muted-foreground">API Uptime</div>
              </div>
              <div className="text-center p-4 card-gradient rounded-lg">
                <div className="text-2xl font-bold text-success">&lt; 50ms</div>
                <div className="text-sm text-muted-foreground">Response Time</div>
              </div>
            </div>
          </div>
        </div>

        {/* Language Support */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold mb-8">Language Support</h3>
          
          <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="p-4 card-gradient rounded-lg">
              <div className="font-semibold">Python</div>
              <div className="text-sm text-muted-foreground">Full SDK Available</div>
            </div>
            <div className="p-4 card-gradient rounded-lg">
              <div className="font-semibold">Node.js</div>
              <div className="text-sm text-muted-foreground">Full SDK Available</div>
            </div>
            <div className="p-4 card-gradient rounded-lg">
              <div className="font-semibold">REST API</div>
              <div className="text-sm text-muted-foreground">Any Language</div>
            </div>
            <div className="p-4 card-gradient rounded-lg">
              <div className="font-semibold">GraphQL</div>
              <div className="text-sm text-muted-foreground">Coming Soon</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default APISection;