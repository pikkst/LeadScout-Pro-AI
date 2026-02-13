import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-white/10 py-8 mt-auto" role="contentinfo">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Company info */}
          <div className="text-center md:text-left">
            <p className="text-gray-300 text-sm font-medium">
              &copy; 2026 EventNexus OÜ. All Rights Reserved.
            </p>
            <p className="text-gray-500 text-xs mt-1">
              EventNexus OÜ (reg. no. 17431557), Põltsamaa, Estonia
            </p>
          </div>

          {/* Contact */}
          <div className="flex flex-col items-center md:items-end gap-1">
            <a
              href="mailto:villu@mail.eventnexus.eu"
              className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
              aria-label="Contact us by email"
            >
              villu@mail.eventnexus.eu
            </a>
            <p className="text-gray-500 text-xs">Response time: Within 24 hours</p>
          </div>

          {/* Language & links */}
          <nav className="flex flex-col items-center md:items-end gap-1" aria-label="Footer navigation">
            <span className="text-gray-400 text-xs">English (US)</span>
            <div className="flex gap-3 text-xs">
              <a href="/privacy" className="text-gray-500 hover:text-gray-300 transition-colors">
                Privacy Policy
              </a>
              <span className="text-gray-700" aria-hidden="true">·</span>
              <a href="/terms" className="text-gray-500 hover:text-gray-300 transition-colors">
                Terms of Service
              </a>
            </div>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
