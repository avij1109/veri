import { Zap, Twitter, Linkedin, Github, Mail, ExternalLink } from 'lucide-react';

const Footer = () => {
  const footerLinks = {
    product: [
      { name: 'Features', href: '#features' },
      { name: 'Pricing', href: '#pricing' },
      { name: 'API', href: '#api' },
      { name: 'Chrome Extension', href: '#' },
      { name: 'Changelog', href: '#' }
    ],
    resources: [
      { name: 'Documentation', href: '#' },
      { name: 'API Reference', href: '#' },
      { name: 'Tutorials', href: '#' },
      { name: 'Blog', href: '#' },
      { name: 'Status Page', href: '#' }
    ],
    company: [
      { name: 'About Us', href: '#about' },
      { name: 'Contact', href: '#contact' },
      { name: 'Careers', href: '#' },
      { name: 'Press Kit', href: '#' },
      { name: 'Partners', href: '#' }
    ],
    legal: [
      { name: 'Privacy Policy', href: '#' },
      { name: 'Terms of Service', href: '#' },
      { name: 'Cookie Policy', href: '#' },
      { name: 'Data Processing', href: '#' },
      { name: 'GDPR', href: '#' }
    ]
  };

  const socialLinks = [
    { name: 'Twitter', icon: Twitter, href: '#' },
    { name: 'LinkedIn', icon: Linkedin, href: '#' },
    { name: 'GitHub', icon: Github, href: '#' }
  ];

  return (
    <footer className="bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="py-16">
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Brand Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Logo */}
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-electric rounded-lg">
                  <Zap className="h-6 w-6 text-electric-foreground" />
                </div>
                <span className="text-2xl font-bold text-gradient">VeriAI</span>
              </div>

              {/* Description */}
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  The Bloomberg Terminal for AI Models. Get instant AI model performance intelligence 
                  with accuracy scores, compliance ratings, and cost optimization.
                </p>
                <p className="text-sm text-muted-foreground">
                  Built for the AI community by developers who understand the challenges of model evaluation.
                </p>
              </div>

              {/* Contact Info */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>hello@veriai.com</span>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex space-x-4">
                {socialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.href}
                    className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center hover:bg-electric/10 hover:text-electric transition-colors"
                    aria-label={social.name}
                  >
                    <social.icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links Columns */}
            <div className="grid md:grid-cols-4 gap-8 lg:col-span-3">
              {/* Product */}
              <div>
                <h3 className="font-semibold mb-4">Product</h3>
                <ul className="space-y-3">
                  {footerLinks.product.map((link, index) => (
                    <li key={index}>
                      <a
                        href={link.href}
                        className="text-muted-foreground hover:text-electric transition-colors text-sm"
                      >
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Resources */}
              <div>
                <h3 className="font-semibold mb-4">Resources</h3>
                <ul className="space-y-3">
                  {footerLinks.resources.map((link, index) => (
                    <li key={index}>
                      <a
                        href={link.href}
                        className="text-muted-foreground hover:text-electric transition-colors text-sm flex items-center"
                      >
                        {link.name}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company */}
              <div>
                <h3 className="font-semibold mb-4">Company</h3>
                <ul className="space-y-3">
                  {footerLinks.company.map((link, index) => (
                    <li key={index}>
                      <a
                        href={link.href}
                        className="text-muted-foreground hover:text-electric transition-colors text-sm"
                      >
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h3 className="font-semibold mb-4">Legal</h3>
                <ul className="space-y-3">
                  {footerLinks.legal.map((link, index) => (
                    <li key={index}>
                      <a
                        href={link.href}
                        className="text-muted-foreground hover:text-electric transition-colors text-sm"
                      >
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="py-8 border-t border-border">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-xl font-bold mb-2">Stay Updated</h3>
            <p className="text-muted-foreground mb-6">
              Get the latest updates on new models, features, and AI evaluation insights
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-electric"
              />
              <button className="btn-hero px-6 py-2 rounded-lg font-semibold whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-border">
          <div className="flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
            <p>© 2024 VeriAI. All rights reserved.</p>
            
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <span>Built with ❤️ for the AI community</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span>All systems operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;