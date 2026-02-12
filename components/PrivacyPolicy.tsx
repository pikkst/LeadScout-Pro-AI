import React from 'react';
import { Link } from 'react-router-dom';
import Footer from './Footer';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white flex flex-col">
      <div className="container mx-auto px-6 py-12 max-w-3xl flex-1">
        <Link to="/" className="text-blue-300 hover:text-white mb-8 inline-block">&larr; Back to Home</Link>
        
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-blue-200 mb-6">Last updated: February 12, 2026</p>

        <div className="space-y-8 text-blue-100 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">1. Data Controller</h2>
            <p>
              LeadScout Pro AI is a product of <strong>EventNexus OÜ</strong> (registry code: 17431557),
              located in Põltsamaa, Estonia. EventNexus OÜ is the data controller responsible for your personal data.
            </p>
            <p className="mt-2">
              Contact: <a href="mailto:villu@mail.eventnexus.eu" className="text-blue-300 hover:text-blue-200 underline">villu@mail.eventnexus.eu</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">2. Data We Collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account data:</strong> Email address, full name, password (hashed)</li>
              <li><strong>Usage data:</strong> Search queries, search locations, search results</li>
              <li><strong>Payment data:</strong> Processed by Stripe — we never store card details</li>
              <li><strong>Technical data:</strong> Browser type, IP address, access timestamps</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">3. Legal Basis for Processing</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Contract performance:</strong> To provide the lead generation service you signed up for</li>
              <li><strong>Legitimate interest:</strong> To improve our service and prevent abuse</li>
              <li><strong>Consent:</strong> For optional marketing communications (you can opt out anytime)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">4. Data Sharing</h2>
            <p>We share data only with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Supabase:</strong> Database and authentication hosting (EU/US)</li>
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>Google (Gemini API):</strong> AI-powered lead discovery (search queries only)</li>
            </ul>
            <p className="mt-2">We do not sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">5. Your Rights (GDPR)</h2>
            <p>Under the General Data Protection Regulation, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate personal data</li>
              <li><strong>Erasure:</strong> Request deletion of your account and all associated data</li>
              <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format</li>
              <li><strong>Restriction:</strong> Request limitation of processing</li>
              <li><strong>Objection:</strong> Object to processing based on legitimate interest</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, use the "Delete My Account" option in your dashboard,
              or contact us at <a href="mailto:villu@mail.eventnexus.eu" className="text-blue-300 hover:text-blue-200 underline">villu@mail.eventnexus.eu</a>.
              We will respond within 24 hours.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">6. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. Search history is kept for 12 months.
              Upon account deletion, all personal data is permanently removed within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">7. Security</h2>
            <p>
              We use industry-standard security measures including encrypted connections (HTTPS),
              Row Level Security on database tables, hashed passwords, and secure API key management.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">8. Cookies</h2>
            <p>
              We use essential cookies for authentication only. We do not use tracking or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">9. Supervisory Authority</h2>
            <p>
              If you believe your data protection rights have been violated, you have the right to lodge a complaint
              with the Estonian Data Protection Inspectorate (Andmekaitse Inspektsioon):
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Website: <a href="https://www.aki.ee" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline">www.aki.ee</a></li>
              <li>Email: info@aki.ee</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">10. Contact</h2>
            <p>
              For any questions about this Privacy Policy, contact us:
            </p>
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

export default PrivacyPolicy;
