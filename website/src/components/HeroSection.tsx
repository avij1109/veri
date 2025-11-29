import { ArrowRight, Clock, DollarSign, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HeroSection = () => {
  return (
    <section id="home" className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-muted to-background" />
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-electric/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-32 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Get AI Model Performance Intelligence in{' '}
                <span className="text-gradient">0.2 Seconds</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Stop wasting hours evaluating AI models. VeriAI provides instant accuracy scores, 
                compliance ratings, and performance insights for any AI model - from GPT-4 to specialized BERT variants.
              </p>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 card-gradient rounded-lg">
                <div className="text-2xl font-bold text-electric">500,000+</div>
                <div className="text-sm text-muted-foreground">Models Analyzed</div>
              </div>
              <div className="text-center p-4 card-gradient rounded-lg">
                <div className="text-2xl font-bold text-success">0.2s</div>
                <div className="text-sm text-muted-foreground">Response Time</div>
              </div>
              <div className="text-center p-4 card-gradient rounded-lg">
                <div className="text-2xl font-bold text-warning">95%</div>
                <div className="text-sm text-muted-foreground">Cost Savings</div>
              </div>
              <div className="text-center p-4 card-gradient rounded-lg">
                <div className="text-2xl font-bold text-primary">99.9%</div>
                <div className="text-sm text-muted-foreground">Uptime SLA</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="btn-hero text-lg">
                Get Chrome Extension
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="btn-outline text-lg">
                View Live Demo
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-success" />
                <span>Enterprise Grade</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-warning" />
                <span>Instant Results</span>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-success" />
                <span>95% Cost Savings</span>
              </div>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="relative">
            {/* Comparison Visual */}
            <div className="space-y-6">
              {/* Traditional Evaluation */}
              <div className="card-elevated p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-destructive">Traditional Evaluation</h3>
                  <Clock className="h-5 w-5 text-destructive" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="text-destructive font-medium">4 hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost:</span>
                    <span className="text-destructive font-medium">$50.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="text-warning">Loading...</span>
                  </div>
                </div>
                <div className="mt-4 w-full bg-muted rounded-full h-2">
                  <div className="bg-destructive h-2 rounded-full w-1/3 animate-pulse"></div>
                </div>
              </div>

              {/* VeriAI Result */}
              <div className="card-elevated p-6 relative animate-glow border-electric/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-success">VeriAI Result</h3>
                  <Zap className="h-5 w-5 text-success" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="text-success font-medium">0.2 seconds</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost:</span>
                    <span className="text-success font-medium">$0.01</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Accuracy:</span>
                    <span className="text-electric font-medium">94.2%</span>
                  </div>
                </div>
                <div className="mt-4 w-full bg-muted rounded-full h-2">
                  <div className="bg-success h-2 rounded-full w-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;