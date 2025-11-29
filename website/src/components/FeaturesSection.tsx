import { 
  Zap, 
  Scale, 
  DollarSign, 
  Plug, 
  BarChart3, 
  TrendingUp, 
  Shield, 
  Clock, 
  Target,
  Users,
  Bell,
  Repeat
} from 'lucide-react';

const FeaturesSection = () => {
  const features = [
    {
      icon: Zap,
      title: "Instant Performance Data",
      description: "0.2-second response time with accuracy, precision, recall, and F1-score metrics plus production readiness assessment.",
      highlights: ["Sub-second response", "Comprehensive metrics", "Production ready scores"]
    },
    {
      icon: Scale,
      title: "Compliance Scoring",
      description: "EU AI Act compliance rating, GDPR readiness score, and comprehensive regulatory risk assessment.",
      highlights: ["EU AI Act ready", "GDPR compliance", "Risk assessment"]
    },
    {
      icon: DollarSign,
      title: "Cost Optimization",
      description: "Model recommendation engine with ROI calculators and detailed performance vs price analysis.",
      highlights: ["ROI optimization", "Cost comparisons", "Smart recommendations"]
    },
    {
      icon: Plug,
      title: "Developer-Friendly",
      description: "RESTful API, Chrome extension, and SDKs for Python, Node.js with comprehensive documentation.",
      highlights: ["Multiple integrations", "Rich SDKs", "Complete docs"]
    },
    {
      icon: BarChart3,
      title: "Enterprise Dashboard",
      description: "Team collaboration tools, evaluation history, and custom reporting for enterprise workflows.",
      highlights: ["Team collaboration", "History tracking", "Custom reports"]
    },
    {
      icon: TrendingUp,
      title: "Continuous Monitoring",
      description: "Model update tracking, performance degradation alerts, and automated re-evaluation capabilities.",
      highlights: ["Update tracking", "Alert system", "Auto re-evaluation"]
    }
  ];

  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Powerful Features for <span className="text-gradient">AI Teams</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Everything you need to evaluate, monitor, and optimize AI model performance at scale
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <div key={index} className="card-elevated p-8 group hover:shadow-glow transition-all duration-300">
              <div className="w-14 h-14 bg-electric/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-electric/20 transition-colors">
                <feature.icon className="h-7 w-7 text-electric" />
              </div>
              
              <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
              <p className="text-muted-foreground mb-6">{feature.description}</p>
              
              <div className="space-y-2">
                {feature.highlights.map((highlight, highlightIndex) => (
                  <div key={highlightIndex} className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-electric rounded-full"></div>
                    <span className="text-sm font-medium">{highlight}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Additional Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center p-6 card-gradient rounded-lg">
            <Shield className="h-8 w-8 text-success mx-auto mb-3" />
            <h4 className="font-semibold mb-2">Security First</h4>
            <p className="text-sm text-muted-foreground">Enterprise-grade security and data protection</p>
          </div>
          
          <div className="text-center p-6 card-gradient rounded-lg">
            <Clock className="h-8 w-8 text-warning mx-auto mb-3" />
            <h4 className="font-semibold mb-2">Real-time Updates</h4>
            <p className="text-sm text-muted-foreground">Live model performance tracking and alerts</p>
          </div>
          
          <div className="text-center p-6 card-gradient rounded-lg">
            <Target className="h-8 w-8 text-electric mx-auto mb-3" />
            <h4 className="font-semibold mb-2">Precision Scoring</h4>
            <p className="text-sm text-muted-foreground">Accurate, standardized evaluation metrics</p>
          </div>
          
          <div className="text-center p-6 card-gradient rounded-lg">
            <Users className="h-8 w-8 text-primary mx-auto mb-3" />
            <h4 className="font-semibold mb-2">Team Collaboration</h4>
            <p className="text-sm text-muted-foreground">Share insights and collaborate on evaluations</p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-16 text-center">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-gradient">500k+</div>
              <div className="text-muted-foreground">Models in Database</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-gradient">99.9%</div>
              <div className="text-muted-foreground">Uptime SLA</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-gradient">24/7</div>
              <div className="text-muted-foreground">Monitoring</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;