import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border/20 bg-background">
      <div className="container mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-[2fr_3fr] gap-12">
          {/* Left Section - Branding & Company Info */}
          <div>
            <h2 className="text-3xl font-heading font-bold text-foreground mb-6">
              <span className="text-foreground">KUBERA</span>{" "}
              <span className="text-primary">MARKETS</span>
            </h2>
            
            {/* Social Media Icons */}
            <div className="flex gap-4 mb-8">
              <a href="https://web.facebook.com/kuberamarkets/?_rdc=1&_rdr" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-muted hover:bg-primary/20 rounded flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-foreground" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="https://www.instagram.com/kuberamarketsofficial/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-muted hover:bg-primary/20 rounded flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-foreground" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="https://www.linkedin.com/company/kubera-markets/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-muted hover:bg-primary/20 rounded flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-foreground" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a href="https://discord.gg/Fs7WgZCGkz" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-muted hover:bg-primary/20 rounded flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-foreground" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </a>
            </div>
            
            {/* Company Info */}
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="text-foreground font-semibold mb-2">Kubera Global Markets LLC</p>
              <p>Euro House, Richmond Hill Road</p>
              <p>Kingstown, St. Vincent and The Grenadines</p>
              <p>Company Number: 3670 LLC 2024</p>
            </div>
          </div>
          
          {/* Right Section - Link Columns */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Important Links */}
            <div>
              <h4 className="font-heading font-bold text-primary text-lg mb-4">Important Links</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/prop/about" className="hover:text-primary transition-colors">Company</Link></li>
                <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
              </ul>
            </div>
            
            {/* Resources */}
            <div>
              <h4 className="font-heading font-bold text-primary text-lg mb-4">Resources</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/prop/dashboard" className="hover:text-primary transition-colors">Dashboard</Link></li>
                <li><Link to="/prop/choose-challenge" className="hover:text-primary transition-colors">Start a Challenge</Link></li>
                <li><Link to="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
                <li><Link to="/faq/downloads" className="hover:text-primary transition-colors">Condor Platform</Link></li>
              </ul>
            </div>
            
            {/* Disclosures */}
            <div>
              <h4 className="font-heading font-bold text-primary text-lg mb-4">Disclosures</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="/documents/KCM-Terms-and-Conditions.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Terms and Conditions</a></li>
                <li><a href="/documents/ANTI-BRIBERY_ANTI-CORRUPTION_POLICY_29102024.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Anti-Bribery and Anti-Corruption</a></li>
                <li><a href="/documents/Privacy_Policy_29102024.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="/documents/KCM-Product-Disclosure-Statement.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Product Disclosure</a></li>
                
              </ul>
            </div>
          </div>
        </div>
        
        {/* Legal Disclaimers Section */}
        <div className="border-t border-border/20 mt-12 pt-8 space-y-6 text-xs text-muted-foreground">
          <div>
            <h5 className="font-semibold text-foreground mb-2">General Risk Disclaimer</h5>
            <p>
              Nothing in our services represents a solicitation, advice, endorsement, or offer to purchase 
              or sell financial instruments by Kubera Global Markets LLC, its agents, employees, contractors, or any 
              connected entities. All investments include substantial risk, and investment decisions are solely 
              the investor&apos;s obligation.
            </p>
          </div>
          
          <div>
            <h5 className="font-semibold text-foreground mb-2">Regulatory Information</h5>
            <p>
              Kubera Global Markets LLC (Company Number: 3670 LLC 2024) is registered in Saint Vincent and the Grenadines. Our business address is at Euro House, Richmond Hill Road, Kingstown, St. Vincent and The Grenadines.
            </p>
          </div>
          
          <div>
            <h5 className="font-semibold text-foreground mb-2">Risk Warning</h5>
            <p>
              Proprietary trading involves substantial risk of loss. Past performance of any trader or trading program is not necessarily indicative of future results. Participating in Kubera&apos;s proprietary trading program means trading with simulated capital under evaluation conditions. Funded account allocations are subject to performance criteria, drawdown limits, and consistency rules as outlined in the Trader Agreement. There is no guarantee that any trader will achieve a funded account or generate profits. You should only participate if you fully understand the rules, risks, and obligations involved.
            </p>
          </div>
          
          <div className="flex items-center justify-between pt-6 border-t border-border/20">
            <div className="text-2xl font-heading font-bold">
              <span className="text-foreground">KUBERA</span>{" "}
              <span className="text-primary">MARKETS</span>
            </div>
            <p>Copyright Kubera Global Markets LLC 2026</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;