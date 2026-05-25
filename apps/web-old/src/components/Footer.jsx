
import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <img 
                src="https://horizons-cdn.hostinger.com/d1b96f74-d973-45dd-a5e2-a03216042c0c/7d28f180a22da2ede165e9992b94d0cb.jpg" 
                alt="bierhaben.com Logo" 
                className="h-10 w-auto brightness-0 invert"
              />
            </div>
            <p className="text-sm text-secondary-foreground/80">
              Der Biermarkt für die DACH-Region
            </p>
            <p className="text-sm text-secondary-foreground/80 mt-2">
              Die Tauschbörse mit Bier-Währung für Deutschland, Österreich und die Schweiz.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <span className="font-semibold mb-4 block">Schnelllinks</span>
            <div className="flex flex-col gap-2">
              <Link to="/" className="text-sm text-secondary-foreground/80 hover:text-secondary-foreground transition-colors duration-200">
                Home
              </Link>
              <Link to="/listings" className="text-sm text-secondary-foreground/80 hover:text-secondary-foreground transition-colors duration-200">
                Angebote durchsuchen
              </Link>
              <Link to="/create-listing" className="text-sm text-secondary-foreground/80 hover:text-secondary-foreground transition-colors duration-200">
                Inserat erstellen
              </Link>
            </div>
          </div>

          {/* Contact & Social */}
          <div>
            <span className="font-semibold mb-4 block">Kontakt</span>
            <div className="flex flex-col gap-2 mb-4">
              <a href="mailto:info@bierhaben.com" className="text-sm text-secondary-foreground/80 hover:text-secondary-foreground transition-colors duration-200 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                info@bierhaben.com
              </a>
            </div>
            <div className="flex gap-3">
              <a href="#" className="p-2 rounded-lg bg-secondary-foreground/10 hover:bg-secondary-foreground/20 transition-all duration-200">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-secondary-foreground/10 hover:bg-secondary-foreground/20 transition-all duration-200">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-secondary-foreground/20 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-secondary-foreground/80">
            © 2026 bierhaben.com. Alle Rechte vorbehalten.
          </p>
          <div className="flex gap-4">
            <Link to="/privacy" className="text-sm text-secondary-foreground/80 hover:text-secondary-foreground transition-colors duration-200">
              Datenschutz
            </Link>
            <Link to="/terms" className="text-sm text-secondary-foreground/80 hover:text-secondary-foreground transition-colors duration-200">
              AGB
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
