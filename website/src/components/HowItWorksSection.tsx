import { Database, Gauge, Brain, CheckCircle, Zap, Settings } from 'lucide-react';

const HowItWorksSection = () => {
  const processes = [
    {
      icon: Database,
      title: "Popular Models (1000+)",
      subtitle: "Pre-cached real evaluations",
      description: "Instant results for $0.01 with enterprise-grade accuracy",
      features: ["Real benchmark testing", "Multiple dataset evaluations", "Validated accuracy metrics", "Instant availability"],
      price: "$0.01",
      time: "0.2 seconds",
      gradient: "from-success/20 to-success/5"
    },
    {
      icon: Gauge,
      title: "Specialized Models (400k+)",
      subtitle: "Real-time evaluation in minutes",
      description: "Professional testing for $2.00 with custom dataset evaluation",
      features: ["Custom dataset testing", "Domain-specific benchmarks", "Detailed performance reports", "Quality assurance"],
      price: "$2.00",
      time: "2-5 minutes",
      gradient: "from-electric/20 to-electric/5"
    },
    {
      icon: Brain,
      title: "Any Model (Unlimited)",
      subtitle: "AI-powered intelligent estimates",
      description: "Architecture-based analysis with clearly labeled confidence levels",
      features: ["Architecture analysis", "Similarity matching", "Confidence scoring", "Performance estimates"],
      price: "$0.10",
      time: "5-10 seconds",
      gradient: "from-warning/20 to-warning/5"
    }
  ];

  return (
    <section id="how-it-works" className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Three Ways to Get <span className="text-gradient">Model Intelligence</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Choose the approach that fits your needs - from instant cached results to custom evaluations
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {processes.map((process, index) => (
            <div key={index} className={`card-elevated p-8 relative overflow-hidden`}>
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${process.gradient} opacity-50`} />
              
              <div className="relative z-10">
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <process.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{process.title}</h3>
                  <p className="text-muted-foreground font-medium">{process.subtitle}</p>
                </div>

                {/* Description */}
                <p className="text-center text-muted-foreground mb-6">
                  {process.description}
                </p>

                {/* Features */}
                <div className="space-y-3 mb-6">
                  {process.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center space-x-3">
                      <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Pricing & Time */}
                <div className="border-t border-border pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">{process.price}</div>
                      <div className="text-xs text-muted-foreground">per query</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-electric">{process.time}</div>
                      <div className="text-xs text-muted-foreground">average time</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Process Flow */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-center mb-8">How It Works</h3>
          
          <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-8">
            {/* Step 1 */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-electric rounded-full flex items-center justify-center">
                <span className="text-electric-foreground font-bold">1</span>
              </div>
              <div>
                <div className="font-semibold">Submit Model</div>
                <div className="text-sm text-muted-foreground">Enter model name or URL</div>
              </div>
            </div>

            <div className="hidden md:block">
              <Zap className="h-6 w-6 text-electric" />
            </div>

            {/* Step 2 */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-electric rounded-full flex items-center justify-center">
                <span className="text-electric-foreground font-bold">2</span>
              </div>
              <div>
                <div className="font-semibold">Intelligent Routing</div>
                <div className="text-sm text-muted-foreground">Auto-select best method</div>
              </div>
            </div>

            <div className="hidden md:block">
              <Settings className="h-6 w-6 text-electric" />
            </div>

            {/* Step 3 */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-electric rounded-full flex items-center justify-center">
                <span className="text-electric-foreground font-bold">3</span>
              </div>
              <div>
                <div className="font-semibold">Get Results</div>
                <div className="text-sm text-muted-foreground">Instant performance data</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;