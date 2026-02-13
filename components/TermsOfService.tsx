import React from 'react';
import { Link } from 'react-router-dom';
import Footer from './Footer';
import SEOHead from './SEOHead';
import { useI18n } from '../i18n/I18nContext';

const TermsOfService: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white flex flex-col">
      <SEOHead
        title={t.seo.termsTitle}
        description={t.seo.termsDescription}
      />
      <div className="container mx-auto px-6 py-12 max-w-3xl flex-1">
        <Link to="/" className="text-blue-300 hover:text-white mb-8 inline-block">{t.terms.backToHome}</Link>
        
        <h1 className="text-4xl font-bold mb-8">{t.terms.title}</h1>
        <p className="text-blue-200 mb-6">{t.terms.lastUpdated}</p>

        <div className="space-y-8 text-blue-100 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">{t.terms.section1Title}</h2>
            <p dangerouslySetInnerHTML={{ __html: t.terms.section1Text }} />
            <p className="mt-2">
              {t.terms.section1Contact} <a href="mailto:villu@mail.eventnexus.eu" className="text-blue-300 hover:text-blue-200 underline">villu@mail.eventnexus.eu</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">{t.terms.section2Title}</h2>
            <p dangerouslySetInnerHTML={{ __html: t.terms.section2Text }} />
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">{t.terms.section3Title}</h2>
            <ul className="list-disc pl-6 space-y-2">
              {t.terms.section3Items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">{t.terms.section4Title}</h2>
            <ul className="list-disc pl-6 space-y-2">
              {t.terms.section4Items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">{t.terms.section5Title}</h2>
            <p>{t.terms.section5Text}</p>
            <p className="mt-2">
              {t.terms.section5Refund}{' '}
              <a href="mailto:villu@mail.eventnexus.eu" className="text-blue-300 hover:text-blue-200 underline">villu@mail.eventnexus.eu</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">{t.terms.section6Title}</h2>
            <p dangerouslySetInnerHTML={{ __html: t.terms.section6Text }} />
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">{t.terms.section7Title}</h2>
            <p>{t.terms.section7Intro}</p>
            <ul className="list-disc pl-6 space-y-2">
              {t.terms.section7Items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">{t.terms.section8Title}</h2>
            <p>{t.terms.section8Text}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">{t.terms.section9Title}</h2>
            <p>{t.terms.section9Text}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">{t.terms.section10Title}</h2>
            <p>{t.terms.section10Text}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">{t.terms.section11Title}</h2>
            <p>{t.terms.section11Text}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">{t.terms.section12Title}</h2>
            <p>{t.terms.section12Text}</p>
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

export default TermsOfService;
