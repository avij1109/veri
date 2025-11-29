import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-background/95 backdrop-blur-md shadow-md' : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-electric rounded-lg">
              <Zap className="h-6 w-6 text-electric-foreground" />
            </div>
            <span className="text-2xl font-bold text-gradient">VeriAI</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/home" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-electric transition-colors">
              Home
            </Link>
            <Link to="/dashboard" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-electric transition-colors">
              Dashboard
            </Link>
            <Link to="/watcher" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-electric transition-colors">
              Watcher
            </Link>
            <Link to="/compare" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-electric transition-colors">
              Compare
            </Link>
            <button onClick={() => scrollToSection('features')} className="text-foreground hover:text-electric transition-colors">
              Features
            </button>
            <button onClick={() => scrollToSection('pricing')} className="text-foreground hover:text-electric transition-colors">
              Pricing
            </button>
            <button onClick={() => scrollToSection('api')} className="text-foreground hover:text-electric transition-colors">
              API
            </button>
            <button onClick={() => scrollToSection('about')} className="text-foreground hover:text-electric transition-colors">
              About
            </button>
            <button onClick={() => scrollToSection('contact')} className="text-foreground hover:text-electric transition-colors">
              Contact
            </button>
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            <Button className="btn-hero">Get Extension</Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-background/95 backdrop-blur-md border-t border-border">
            <div className="px-4 py-4 space-y-4">
              <button onClick={() => scrollToSection('home')} className="block w-full text-left text-foreground hover:text-electric transition-colors">
                Home
              </button>
              <Link to="/dashboard" target="_blank" rel="noopener noreferrer" className="block w-full text-left text-foreground hover:text-electric transition-colors">
                Dashboard
              </Link>
              <Link to="/watcher" target="_blank" rel="noopener noreferrer" className="block w-full text-left text-foreground hover:text-electric transition-colors">
                Watcher
              </Link>
              <Link to="/compare" target="_blank" rel="noopener noreferrer" className="block w-full text-left text-foreground hover:text-electric transition-colors">
                Compare
              </Link>
              <button onClick={() => scrollToSection('features')} className="block w-full text-left text-foreground hover:text-electric transition-colors">
                Features
              </button>
              <button onClick={() => scrollToSection('pricing')} className="block w-full text-left text-foreground hover:text-electric transition-colors">
                Pricing
              </button>
              <button onClick={() => scrollToSection('api')} className="block w-full text-left text-foreground hover:text-electric transition-colors">
                API
              </button>
              <button onClick={() => scrollToSection('about')} className="block w-full text-left text-foreground hover:text-electric transition-colors">
                About
              </button>
              <button onClick={() => scrollToSection('contact')} className="block w-full text-left text-foreground hover:text-electric transition-colors">
                Contact
              </button>
              <Button className="btn-hero w-full">Get Extension</Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;