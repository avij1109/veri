import { Check, ArrowRight, Zap, Crown, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PricingSection = () => {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "/month",
      description: "Perfect for getting started with AI model evaluation",
      icon: Zap,
      features: [
        "10 queries per month",
        "Basic model information",
        "Community support",
        "Standard response time",
        "Public model database access"
      ],
      cta: "Get Started Free",
      popular: false,
      gradient: "from-muted to-muted/50"
    },
    {
      name: "Professional",
      price: "$20",
      period: "/month",
      description: "For developers and small teams building with AI",
      icon: Crown,
      features: [
        "1,000 cached queries",
        "5 real-time evaluations",
        "Full API access",
        "Compliance scoring",
        "Email support",
        "Priority response time",
        "Custom evaluation datasets",
        "Performance analytics"
      ],
      cta: "Start Free Trial",
      popular: true,
      gradient: "from-electric/20 to-electric/5"
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "pricing",
      description: "For large teams and mission-critical AI applications",
      icon: Building,
      features: [
        "Unlimited cached queries",
        "50+ real-time evaluations",
        "Custom evaluation datasets",
        "Dedicated support",
        "SLA guarantees",
        "White-label options",
        "On-premise deployment",
        "Custom integrations",
        "Advanced analytics",
        "Multi-team management"
      ],
      cta: "Contact Sales",
      popular: false,
      gradient: "from-primary/20 to-primary/5"
    }
  ];

  return (
    <section id="pricing" className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Transparent Pricing That <span className="text-gradient">Scales</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Choose the plan that fits your needs. Start free and scale as you grow.
          </p>
          
          {/* Money-back guarantee */}
          <div className="inline-flex items-center space-x-2 bg-success/10 text-success px-4 py-2 rounded-full">
            <Check className="h-4 w-4" />
            <span className="text-sm font-medium">30-day money-back guarantee</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div 
              key={index} 
              className={`card-elevated relative overflow-hidden ${
                plan.popular ? 'ring-2 ring-electric transform scale-105' : ''
              }`}
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${plan.gradient} opacity-50`} />
              
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="bg-electric text-electric-foreground px-4 py-2 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                </div>
              )}

              <div className="relative z-10 p-8">
                {/* Plan Header */}
                <div className="text-center mb-8">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <plan.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                  
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-1">{plan.period}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start space-x-3">
                      <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Button 
                  className={`w-full ${
                    plan.popular 
                      ? 'btn-hero' 
                      : plan.name === 'Free' 
                        ? 'btn-outline' 
                        : 'btn-primary'
                  }`}
                  size="lg"
                >
                  {plan.cta}
                  {plan.name !== 'Enterprise' && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Usage Examples */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold mb-8">Usage Examples</h3>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="p-6 card-gradient rounded-lg">
              <div className="text-lg font-semibold mb-2">Startup</div>
              <div className="text-sm text-muted-foreground mb-3">Testing 5 models/month</div>
              <div className="text-2xl font-bold text-success">Free</div>
            </div>
            
            <div className="p-6 card-gradient rounded-lg border-electric/50">
              <div className="text-lg font-semibold mb-2">Growing Team</div>
              <div className="text-sm text-muted-foreground mb-3">100 models/month + custom datasets</div>
              <div className="text-2xl font-bold text-electric">$29/mo</div>
            </div>
            
            <div className="p-6 card-gradient rounded-lg">
              <div className="text-lg font-semibold mb-2">Enterprise</div>
              <div className="text-sm text-muted-foreground mb-3">1000+ models/month + dedicated support</div>
              <div className="text-2xl font-bold text-primary">Custom</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;