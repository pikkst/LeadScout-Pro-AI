import React from 'react';
import { Link } from 'react-router-dom';
import Footer from './Footer';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white flex flex-col">
      <div className="container mx-auto px-6 py-12 max-w-3xl flex-1">
        <Link to="/" className="text-blue-300 hover:text-white mb-8 inline-block">&larr; Back to Home</Link>
        
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-blue-200 mb-6">Last updated: February 12, 2026</p>

        <div className="space-y-8 text-blue-100 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">1. Service Provider</h2>
            <p>
              LeadScout Pro AI is operated by <strong>EventNexus OÜ</strong> (registry code: 17431557),
              a company registered in Estonia, located in Põltsamaa.
            </p>
            <p className="mt-2">
              Contact: <a href="mailto:villu@mail.eventnexus.eu" className="text-blue-300 hover:text-blue-200 underline">villu@mail.eventnexus.eu</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">2. Service Description</h2>
            <p>
              LeadScout Pro AI provides AI-powered B2B lead generation services. Our platform uses
              artificial intelligence to discover business contact information from publicly available sources.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">3. Account Terms</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must provide accurate registration information</li>
              <li>You are responsible for maintaining your account security</li>
              <li>You must be at least 18 years old to use this service</li>
              <li>One account per person — shared accounts are not permitted</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">4. Credits & Payments</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Credits are purchased in advance and deducted per CSV download</li>
              <li>All payments are processed securely through Stripe</li>
              <li>Credits are non-refundable once used for a download</li>
              <li>Unused credits do not expire</li>
              <li>Downloaded searches can be re-downloaded up to 10 times at no extra cost</li>
              <li>Prices are in EUR and include applicable taxes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">5. Right of Withdrawal</h2>
            <p>
              Under EU consumer protection law, you have a 14-day right of withdrawal for unused credits.
              Once credits have been used to download lead data, the right of withdrawal is waived
              as the digital content has been fully delivered.
            </p>
            <p className="mt-2">
              To request a refund for unused credits, contact us at{' '}
              <a href="mailto:villu@mail.eventnexus.eu" className="text-blue-300 hover:text-blue-200 underline">villu@mail.eventnexus.eu</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">6. Data Accuracy Disclaimer</h2>
            <p>
              Lead data is generated using AI and publicly available information. We make reasonable efforts
              to verify email addresses and business details, but <strong>we do not guarantee 100% accuracy</strong>.
              Users should independently verify critical contact information before use.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">7. Acceptable Use</h2>
            <p>You agree NOT to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the service for sending unsolicited bulk email (spam)</li>
              <li>Violate any applicable anti-spam or data protection laws (including GDPR)</li>
              <li>Attempt to bypass credit requirements or payment systems</li>
              <li>Resell lead data without authorization</li>
              <li>Use automated scripts to access the service without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">8. Intellectual Property</h2>
            <p>
              The LeadScout Pro AI platform, including its design, code, and AI models, is the intellectual
              property of EventNexus OÜ. Lead data you generate and download is yours to use in compliance
              with applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">9. Limitation of Liability</h2>
            <p>
              The service is provided "as is" without warranty. EventNexus OÜ is not liable for damages arising from
              the use of generated lead data, including but not limited to inaccurate contact information,
              failed business outreach, or violations of local regulations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">10. Termination</h2>
            <p>
              We may suspend or terminate accounts that violate these terms. You may delete your account
              at any time through the dashboard. Upon termination, unused credits are forfeited.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">11. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the Republic of Estonia. Any disputes shall be resolved
              in the courts of Estonia, without prejudice to your rights under EU consumer protection regulations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">12. Contact</h2>
            <p>For any questions about these Terms of Service, contact us:</p>
            <ul className="list-none space-y-1 mt-2">
              <li><strong>EventNexus OÜ</strong> (reg. no. 17431557)</li>
              <li>Põltsamaa, Estonia</li>
              <li>Email: <a href="mailto:villu@mail.eventnexus.eu" className="text-blue-300 hover:text-blue-200 underline">villu@mail.eventnexus.eu</a></li>
              <li>Response time: Within 24 hours</li>
            </ul>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TermsOfService;
