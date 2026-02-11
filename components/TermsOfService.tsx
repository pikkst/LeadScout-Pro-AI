import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-6 py-12 max-w-3xl">
        <Link to="/" className="text-blue-300 hover:text-white mb-8 inline-block">&larr; Back to Home</Link>
        
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-blue-200 mb-6">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-8 text-blue-100 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">1. Service Description</h2>
            <p>
              LeadScout Pro AI provides AI-powered B2B lead generation services. Our platform uses 
              artificial intelligence to discover business contact information from publicly available sources.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">2. Account Terms</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must provide accurate registration information</li>
              <li>You are responsible for maintaining your account security</li>
              <li>You must be at least 18 years old to use this service</li>
              <li>One account per person — shared accounts are not permitted</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">3. Credits & Payments</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Credits are purchased in advance and deducted per CSV download</li>
              <li>All payments are processed securely through Stripe</li>
              <li>Credits are non-refundable once used for a download</li>
              <li>Unused credits do not expire</li>
              <li>Prices are in EUR and include applicable taxes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">4. Data Accuracy Disclaimer</h2>
            <p>
              Lead data is generated using AI and publicly available information. We make reasonable efforts 
              to verify email addresses and business details, but <strong>we do not guarantee 100% accuracy</strong>. 
              Users should independently verify critical contact information before use.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">5. Acceptable Use</h2>
            <p>You agree NOT to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the service for sending unsolicited bulk email (spam)</li>
              <li>Violate any applicable anti-spam or data protection laws</li>
              <li>Attempt to bypass credit requirements or payment systems</li>
              <li>Resell lead data without authorization</li>
              <li>Use automated scripts to access the service without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">6. Intellectual Property</h2>
            <p>
              The LeadScout Pro AI platform, including its design, code, and AI models, is our intellectual property.
              Lead data you generate and download is yours to use in compliance with applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">7. Limitation of Liability</h2>
            <p>
              The service is provided "as is" without warranty. We are not liable for damages arising from 
              the use of generated lead data, including but not limited to inaccurate contact information, 
              failed business outreach, or violations of local regulations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">8. Termination</h2>
            <p>
              We may suspend or terminate accounts that violate these terms. You may delete your account 
              at any time through the dashboard. Upon termination, unused credits are forfeited.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">9. Contact</h2>
            <p>
              For questions about these terms, contact us at: <span className="text-blue-300">legal@leadscoutpro.ai</span>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
