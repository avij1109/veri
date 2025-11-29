import { ArrowRight, Download, BookOpen, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CTASection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-electric to-primary opacity-5" />
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-96 h-96 bg-electric/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main CTA */}
          <div className="mb-16">
            <h2 className="text-5xl font-bold mb-6">
              Start Evaluating AI Models in <span className="text-gradient">Seconds</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Join 1,000+ developers and AI teams using VeriAI for instant model intelligence. 
              Get started for free and see why teams choose VeriAI for their AI evaluation needs.
            </p>

            {/* Primary CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" className="btn-hero text-lg px-8 py-4">
                <Download className="mr-2 h-5 w-5" />
                Get Chrome Extension
              </Button>
              <Button size="lg" variant="outline" className="btn-outline text-lg px-8 py-4">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Secondary CTA */}
            <Button variant="ghost" className="text-electric hover:text-electric/80">
              <BookOpen className="mr-2 h-4 w-4" />
              View Documentation
            </Button>
          </div>

          {/* Feature Highlights */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="card-elevated p-8 text-center">
              <div className="w-16 h-16 bg-success/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-success" />
              </div>
              <h3 className="font-bold mb-2">Instant Results</h3>
              <p className="text-muted-foreground">Get model performance data in 0.2 seconds</p>
            </div>

            <div className="card-elevated p-8 text-center">
              <div className="w-16 h-16 bg-electric/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-electric">95%</span>
              </div>
              <h3 className="font-bold mb-2">Cost Savings</h3>
              <p className="text-muted-foreground">Save thousands on model evaluation costs</p>
            </div>

            <div className="card-elevated p-8 text-center">
              <div className="w-16 h-16 bg-warning/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-warning">500k+</span>
              </div>
              <h3 className="font-bold mb-2">Model Coverage</h3>
              <p className="text-muted-foreground">Comprehensive database of AI models</p>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="border-t border-border pt-12">
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span>Free to start</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-electric rounded-full"></div>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-warning rounded-full"></div>
                <span>30-day money-back guarantee</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>

          {/* Urgency/Social Proof */}
          <div className="mt-12 p-6 bg-electric/5 rounded-2xl border border-electric/20">
            <p className="text-electric font-medium">
              🔥 Join over 1,000 companies already using VeriAI to accelerate their AI development
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;