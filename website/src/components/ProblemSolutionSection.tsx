import { Clock, DollarSign, Target, Scale, BarChart3, Zap, Database, Gauge, Globe, Shield } from 'lucide-react';

const ProblemSolutionSection = () => {
  const problems = [
    {
      icon: Clock,
      title: "Takes 2-6 hours per model evaluation",
      description: "Manual testing and evaluation processes are time-consuming"
    },
    {
      icon: DollarSign,
      title: "Costs $50-500 per evaluation",
      description: "Expensive compute resources and expert time"
    },
    {
      icon: Target,
      title: "No standardized benchmarks",
      description: "Inconsistent evaluation criteria across different models"
    },
    {
      icon: Scale,
      title: "No compliance/regulatory scoring",
      description: "Missing critical compliance assessments for enterprise use"
    },
    {
      icon: BarChart3,
      title: "No centralized intelligence platform",
      description: "Scattered data and insights across multiple tools"
    }
  ];

  const solutions = [
    {
      icon: Zap,
      title: "Pre-evaluated database of top models",
      description: "Instant access to comprehensive model performance data"
    },
    {
      icon: DollarSign,
      title: "$0.01 per query vs $50+ traditional cost",
      description: "Dramatic cost reduction through intelligent caching"
    },
    {
      icon: Database,
      title: "Real evaluations for popular models",
      description: "Authentic benchmarks on standardized datasets"
    },
    {
      icon: Gauge,
      title: "Smart estimates for specialized models",
      description: "AI-powered analysis for niche and custom models"
    },
    {
      icon: Scale,
      title: "Built-in compliance scoring",
      description: "EU AI Act, GDPR, and regulatory compliance ratings"
    },
    {
      icon: Globe,
      title: "Comprehensive API for any integration",
      description: "Seamless integration into existing workflows"
    }
  ];

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Problem Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-destructive mb-4">
              AI Model Evaluation is Broken
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Current evaluation methods are expensive, time-consuming, and lack standardization
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {problems.map((problem, index) => (
              <div key={index} className="card-elevated p-6 text-center">
                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <problem.icon className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="font-semibold mb-2 text-destructive">{problem.title}</h3>
                <p className="text-muted-foreground text-sm">{problem.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Solution Section */}
        <div>
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-success mb-4">
              VeriAI Solves This With Intelligent Caching
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our platform combines pre-computed evaluations with real-time analysis for instant, accurate results
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {solutions.map((solution, index) => (
              <div key={index} className="card-elevated p-6 text-center hover:shadow-glow transition-all duration-300">
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <solution.icon className="h-6 w-6 text-success" />
                </div>
                <h3 className="font-semibold mb-2 text-success">{solution.title}</h3>
                <p className="text-muted-foreground text-sm">{solution.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison Stats */}
        <div className="mt-16 text-center">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-gradient">95%</div>
              <div className="text-muted-foreground">Cost Reduction</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-gradient">500x</div>
              <div className="text-muted-foreground">Faster Results</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-gradient">100%</div>
              <div className="text-muted-foreground">Standardized</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSolutionSection;