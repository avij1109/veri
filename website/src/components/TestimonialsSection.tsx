import { Star, Quote } from 'lucide-react';

const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "Sarah Chen",
      role: "AI Lead",
      company: "TechCorp",
      avatar: "SC",
      quote: "VeriAI saved us 40 hours per week on model evaluation. The instant results and compliance scoring are game-changers for our enterprise deployment.",
      rating: 5
    },
    {
      name: "Marcus Johnson",
      role: "CTO",
      company: "FinanceAI",
      avatar: "MJ",
      quote: "The compliance scoring alone is worth 10x the subscription cost. EU AI Act readiness in seconds instead of weeks of analysis.",
      rating: 5
    },
    {
      name: "Dr. Lisa Wang",
      role: "ML Researcher",
      company: "Research Institute",
      avatar: "LW",
      quote: "Finally, a reliable source of truth for AI model performance. The standardized benchmarks help us make confident decisions.",
      rating: 5
    }
  ];

  const stats = [
    { number: "1,000+", label: "Companies Trust VeriAI" },
    { number: "10,000+", label: "Developers Using Daily" },
    { number: "4.9/5", label: "Average Rating" },
    { number: "99%", label: "Would Recommend" }
  ];

  const companies = [
    "TechCorp", "FinanceAI", "DataFlow", "AIventure", "CloudTech", "ModelLabs"
  ];

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Trusted by <span className="text-gradient">AI Teams Worldwide</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            See what developers and AI teams are saying about VeriAI
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="card-elevated p-8 relative">
              {/* Quote Icon */}
              <div className="absolute top-6 right-6">
                <Quote className="h-8 w-8 text-electric/20" />
              </div>

              {/* Rating */}
              <div className="flex items-center space-x-1 mb-4">
                {[...Array(testimonial.rating)].map((_, starIndex) => (
                  <Star key={starIndex} className="h-4 w-4 fill-warning text-warning" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-foreground mb-6 italic">
                "{testimonial.quote}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-electric/10 rounded-full flex items-center justify-center">
                  <span className="font-semibold text-electric">{testimonial.avatar}</span>
                </div>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.role} at {testimonial.company}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="text-center p-6 card-gradient rounded-lg">
              <div className="text-3xl font-bold text-gradient mb-2">{stat.number}</div>
              <div className="text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Company Logos */}
        <div className="text-center">
          <p className="text-muted-foreground mb-8">Trusted by companies worldwide</p>
          
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            {companies.map((company, index) => (
              <div key={index} className="px-6 py-3 bg-muted/50 rounded-lg">
                <span className="font-semibold text-muted-foreground">{company}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <div className="max-w-2xl mx-auto p-8 card-elevated bg-gradient-to-r from-electric/5 to-primary/5">
            <h3 className="text-2xl font-bold mb-4">Join Thousands of Satisfied Users</h3>
            <p className="text-muted-foreground mb-6">
              Start evaluating AI models instantly with our free tier
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-hero px-8 py-3 rounded-lg font-semibold transition-all duration-300">
                Get Started Free
              </button>
              <button className="btn-outline px-8 py-3 rounded-lg font-semibold transition-all duration-300">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;