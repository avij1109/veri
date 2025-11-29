import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "How accurate are your evaluations?",
      answer: "Our evaluations are highly accurate, with 95%+ correlation with real-world performance. For popular models (1000+), we use real benchmark testing on standardized datasets. For specialized models, we provide professional evaluation services. For any model, our AI-powered estimates include clear confidence levels."
    },
    {
      question: "What makes VeriAI different from competitors?",
      answer: "VeriAI combines three unique advantages: (1) Pre-cached evaluations for instant results, (2) Built-in compliance scoring for regulatory requirements, and (3) Intelligent routing that automatically selects the best evaluation method. This results in 500x faster results at 95% lower cost."
    },
    {
      question: "How do you handle model updates?",
      answer: "We continuously monitor popular models for updates and automatically re-evaluate them. You'll receive notifications when models you've queried receive updates. Our system tracks version changes and provides historical performance data."
    },
    {
      question: "Is there an API rate limit?",
      answer: "Rate limits vary by plan: Free tier allows 10 queries/month, Professional allows 1,000 queries/month plus 5 real-time evaluations, and Enterprise has custom limits. API requests are limited to 1,000 per hour across all plans for optimal performance."
    },
    {
      question: "Do you support custom evaluation datasets?",
      answer: "Yes! Professional and Enterprise plans support custom evaluation datasets. You can upload your own datasets for domain-specific testing, or we can help you create custom benchmarks that match your specific use case requirements."
    },
    {
      question: "What compliance standards do you cover?",
      answer: "We provide comprehensive compliance scoring including EU AI Act readiness, GDPR compliance, algorithmic bias assessment, fairness metrics, and regulatory risk scoring. Enterprise plans include additional compliance frameworks and custom regulatory assessments."
    },
    {
      question: "How does the intelligent routing work?",
      answer: "Our system automatically determines the best evaluation method based on the model you submit. Popular models get instant cached results, specialized models trigger real-time evaluation, and unknown models receive AI-powered estimates. This ensures you always get the fastest, most accurate results available."
    },
    {
      question: "Can I integrate VeriAI into my existing workflow?",
      answer: "Absolutely! We offer a RESTful API, Chrome extension, Python and Node.js SDKs, and webhook support. Our documentation includes examples for popular ML frameworks like HuggingFace, PyTorch, and TensorFlow. Enterprise plans include custom integration support."
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Frequently Asked <span className="text-gradient">Questions</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Get answers to common questions about VeriAI's AI model evaluation platform
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="card-elevated overflow-hidden">
                <button
                  className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
                  onClick={() => toggleFAQ(index)}
                >
                  <h3 className="text-lg font-semibold pr-4">{faq.question}</h3>
                  {openIndex === index ? (
                    <ChevronUp className="h-5 w-5 text-electric flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                
                {openIndex === index && (
                  <div className="px-8 pb-6">
                    <div className="border-t border-border pt-6">
                      <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Additional Help */}
        <div className="text-center mt-16">
          <div className="max-w-2xl mx-auto p-8 card-elevated">
            <h3 className="text-2xl font-bold mb-4">Still have questions?</h3>
            <p className="text-muted-foreground mb-6">
              Our team is here to help you get the most out of VeriAI
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-hero px-6 py-3 rounded-lg font-semibold">
                Contact Support
              </button>
              <button className="btn-outline px-6 py-3 rounded-lg font-semibold">
                Join Community
              </button>
            </div>
          </div>
        </div>

        {/* Help Resources */}
        <div className="grid md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
          <div className="text-center p-6 card-gradient rounded-lg">
            <div className="text-2xl font-bold text-electric mb-2">📚</div>
            <h4 className="font-semibold mb-2">Documentation</h4>
            <p className="text-sm text-muted-foreground">Comprehensive guides and API references</p>
          </div>
          
          <div className="text-center p-6 card-gradient rounded-lg">
            <div className="text-2xl font-bold text-success mb-2">💬</div>
            <h4 className="font-semibold mb-2">Community</h4>
            <p className="text-sm text-muted-foreground">Join our Discord for help and discussions</p>
          </div>
          
          <div className="text-center p-6 card-gradient rounded-lg">
            <div className="text-2xl font-bold text-warning mb-2">🎓</div>
            <h4 className="font-semibold mb-2">Tutorials</h4>
            <p className="text-sm text-muted-foreground">Step-by-step guides and video tutorials</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;