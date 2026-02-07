import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { creditPackages, CreditPackage } from '../services/stripeService';
import getStripe from '../services/stripeService';

interface CreditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreditPurchaseModal: React.FC<CreditPurchaseModalProps> = ({ isOpen, onClose }) => {
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, updateCredits } = useAuth();

  if (!isOpen) return null;

  const handlePurchase = async (pkg: CreditPackage) => {
    if (!user) {
      alert('Please sign in to purchase credits');
      return;
    }

    setLoading(true);
    try {
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Stripe failed to initialize');
      }

      // In a real implementation, you would call your backend to create a payment intent
      // For demo purposes, we'll simulate a successful payment
      console.log('Simulating credit purchase:', pkg);
      
      // Simulate successful payment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Add credits to user account
      await updateCredits(pkg.credits);
      
      alert(`Successfully purchased ${pkg.credits} credits!`);
      onClose();
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Purchase Credits</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Each download costs 1 credit (€5). Purchase credits to download lead search results.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {creditPackages.map((pkg) => (
            <div
              key={pkg.id}
              className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                pkg.popular
                  ? 'border-blue-500 bg-blue-50 transform scale-105'
                  : 'border-gray-200 hover:border-blue-300'
              } ${selectedPackage?.id === pkg.id ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setSelectedPackage(pkg)}
            >
              {pkg.popular && (
                <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full inline-block mb-2">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-bold mb-2">{pkg.name}</h3>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                €{pkg.price}
              </div>
              <div className="text-gray-600 mb-4">
                {pkg.credits} credit{pkg.credits > 1 ? 's' : ''}
              </div>
              <div className="text-sm text-gray-500 mb-4">
                €{pkg.pricePerCredit.toFixed(2)} per download
              </div>
              <button
                onClick={() => handlePurchase(pkg)}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Purchase'}
              </button>
            </div>
          ))}
        </div>

        <div className="text-xs text-gray-500 text-center">
          <p>Secure payment processing by Stripe</p>
          <p>Credits never expire and are tied to your account</p>
        </div>
      </div>
    </div>
  );
};

export default CreditPurchaseModal;