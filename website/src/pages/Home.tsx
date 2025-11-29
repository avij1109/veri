import Navigation from '@/components/Navigation';
import HeroSection from '@/components/HeroSection';
import ProblemSolutionSection from '@/components/ProblemSolutionSection';
import HowItWorksSection from '@/components/HowItWorksSection';
import FeaturesSection from '@/components/FeaturesSection';
import PricingSection from '@/components/PricingSection';
import APISection from '@/components/APISection';
import TestimonialsSection from '@/components/TestimonialsSection';
import FAQSection from '@/components/FAQSection';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';

const Home = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main>
        <HeroSection />
        <ProblemSolutionSection />
        <HowItWorksSection />
        <FeaturesSection />
        <PricingSection />
        <APISection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
      </main>
      
      <Footer />
    </div>
  );
};

export default Home;