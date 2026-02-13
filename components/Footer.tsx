import React from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import { useI18n } from '../i18n/I18nContext';

const Footer: React.FC = () => {
  const { t } = useI18n();

  return (
    <footer className="bg-slate-950 border-t border-white/10 py-8 mt-auto" role="contentinfo">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Company info */}
          <div className="text-center md:text-left">
            <p className="text-gray-300 text-sm font-medium">
              {t.footer.allRights}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              {t.footer.companyInfo}
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
            <p className="text-gray-500 text-xs">{t.footer.responseTime}</p>
          </div>

          {/* Language & links */}
          <nav className="flex flex-col items-center md:items-end gap-1" aria-label="Footer navigation">
            <LanguageSwitcher />
            <div className="flex gap-3 text-xs">
              <a href="/privacy" className="text-gray-500 hover:text-gray-300 transition-colors">
                {t.footer.privacyPolicy}
              </a>
              <span className="text-gray-700" aria-hidden="true">·</span>
              <a href="/terms" className="text-gray-500 hover:text-gray-300 transition-colors">
                {t.footer.termsOfService}
              </a>
            </div>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
