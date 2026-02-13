import React from 'react';
import { Link } from 'react-router-dom';
import Footer from './Footer';
import SEOHead from './SEOHead';
import { useI18n } from '../i18n/I18nContext';

const PrivacyPolicy: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white flex flex-col">
      <SEOHead
        title={t.seo.privacyTitle}
        description={t.seo.privacyDescription}
      />
      <div className="container mx-auto px-6 py-12 max-w-3xl flex-1">
        <Link to="/" className="text-blue-300 hover:text-white mb-8 inline-block">{t.privacy.backToHome}</Link>
        
        <h1 className="text-4xl font-bold mb-8">{t.privacy.title}</h1>
        <p className="text-blue-200 mb-6">{t.privacy.lastUpdated}</p>

        <div className="space-y-8 text-blue-100 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">{t.privacy.section1Title}</h2>
            <p dangerouslySetInnerHTML={{ __html: t.privacy.section1Text }} />
            <p className="mt-2">
              {t.privacy.section1Contact} <a href="mailto:villu@mail.eventnexus.eu" className="text-blue-300 hover:text-blue-200 underline">villu@mail.eventnexus.eu</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">{t.privacy.section2Title}</h2>
            <ul className="list-disc pl-6 space-y-2">
              {t.privacy.section2Items.map((item, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">{t.privacy.section3Title}</h2>
            <ul className="list-disc pl-6 space-y-2">
              {t.privacy.section3Items.map((item, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">{t.privacy.section4Title}</h2>
            <p>{t.privacy.section4Intro}</p>
            <ul className="list-disc pl-6 space-y-2">
              {t.privacy.section4Items.map((item, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
            <p className="mt-2">{t.privacy.section4NoSell}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">{t.privacy.section5Title}</h2>
            <p>{t.privacy.section5Intro}</p>
            <ul className="list-disc pl-6 space-y-2">
              {t.privacy.section5Items.map((item, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
            <p className="mt-2" dangerouslySetInnerHTML={{ __html: t.privacy.section5Exercise }} />
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">{t.privacy.section6Title}</h2>
            <p>{t.privacy.section6Text}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">{t.privacy.section7Title}</h2>
            <p>{t.privacy.section7Text}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">{t.privacy.section8Title}</h2>
            <p>{t.privacy.section8Text}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">{t.privacy.section9Title}</h2>
            <p>{t.privacy.section9Text}</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Website: <a href="https://www.aki.ee" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline">www.aki.ee</a></li>
              <li>Email: info@aki.ee</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">{t.privacy.section10Title}</h2>
            <p>{t.privacy.section10Text}</p>
            <ul className="list-none space-y-1 mt-2">
              <li><strong>EventNexus OÜ</strong> (reg. no. 17431557)</li>
              <li>Põltsamaa, Estonia</li>
              <li>Email: <a href="mailto:villu@mail.eventnexus.eu" className="text-blue-300 hover:text-blue-200 underline">villu@mail.eventnexus.eu</a></li>
              <li>{t.footer.responseTime}</li>
            </ul>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
