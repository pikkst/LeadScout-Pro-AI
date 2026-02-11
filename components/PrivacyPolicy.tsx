import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-6 py-12 max-w-3xl">
        <Link to="/" className="text-blue-300 hover:text-white mb-8 inline-block">&larr; Back to Home</Link>
        
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-blue-200 mb-6">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-8 text-blue-100 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">1. Data Controller</h2>
            <p>
              LeadScout Pro AI ("we", "our", "us") is the data controller responsible for your personal data.
              Contact us at: <span className="text-blue-300">privacy@leadscoutpro.ai</span>
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
              or contact us at <span className="text-blue-300">privacy@leadscoutpro.ai</span>.
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
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
