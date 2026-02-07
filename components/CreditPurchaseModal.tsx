import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { useAuth } from '../contexts/AuthContext';
import { creditPackages, CreditPackage, createPaymentIntent } from '../services/stripeService';

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLIC_KEY || 
  'pk_test_51SyAeLR8LYDydhScCmdbXjcmSiUAhCWFWFWbCyFVhH00mXbi4l71geGeXy6gOizZ2RMp3fZc5Twpif3xzb4fmt6D00dkxuP87I'
);

interface CreditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PaymentForm: React.FC<{ 
  selectedPackage: CreditPackage; 
  onSuccess: () => void; 
  onError: (error: string) => void;
}> = ({ selectedPackage, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user, updateCredits } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !user) {
      return;
    }

    setLoading(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Create payment intent
      console.log('Creating payment intent for package:', selectedPackage.id);
      const response = await createPaymentIntent(selectedPackage.id, user.id);
      console.log('Payment intent created:', response.clientSecret);

      // Confirm payment with card element
      const { error, paymentIntent } = await stripe.confirmCardPayment(response.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            email: user.email,
          },
        }
      });

      if (error) {
        console.error('Payment confirmation error:', error);
        throw error;
      }

      if (paymentIntent?.status === 'succeeded') {
        console.log('Payment succeeded:', paymentIntent.id);
        // Add credits to user account
        await updateCredits(selectedPackage.credits);
        onSuccess();
      }
    } catch (error: any) {
      console.error('Payment failed:', error);
      onError(error.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border border-gray-200 rounded-lg bg-white">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
                backgroundColor: 'white',
              },
            },
            hidePostalCode: true,
          }}
        />
      </div>
      
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {loading ? 'Processing Payment...' : `Pay €${selectedPackage.price}`}
      </button>
    </form>
  );
};

const CreditPurchaseModal: React.FC<CreditPurchaseModalProps> = ({ isOpen, onClose }) => {
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSuccess = () => {
    setMessage({ type: 'success', text: 'Credits purchased successfully!' });
    setTimeout(() => {
      setMessage(null);
      setSelectedPackage(null);
      onClose();
    }, 2000);
  };

  const handleError = (error: string) => {
    setMessage({ type: 'error', text: error });
  };

  const handleBack = () => {
    setSelectedPackage(null);
    setMessage(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Purchase Credits</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>
        
        {message && (
          <div className={`p-3 rounded-md mb-4 ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {!selectedPackage ? (
          <div className="space-y-3">
            <p className="text-gray-600 text-sm mb-4">
              Each download costs 1 credit (€5). Choose a package:
            </p>
            {creditPackages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg)}
                className={`w-full p-4 border-2 rounded-lg hover:bg-gray-50 text-left transition-all ${
                  pkg.popular ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                {pkg.popular && (
                  <div className="text-xs text-blue-600 font-medium mb-1">Most Popular</div>
                )}
                <div className="font-medium">{pkg.name}</div>
                <div className="text-gray-600">{pkg.credits} credits</div>
                <div className="text-lg font-bold text-blue-600">€{pkg.price}</div>
                <div className="text-sm text-gray-500">€{pkg.pricePerCredit.toFixed(2)} per download</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium">{selectedPackage.name}</h3>
              <p className="text-gray-600">{selectedPackage.credits} credits</p>
              <p className="text-lg font-bold text-blue-600">€{selectedPackage.price}</p>
            </div>

            <Elements stripe={stripePromise}>
              <PaymentForm 
                selectedPackage={selectedPackage}
                onSuccess={handleSuccess}
                onError={handleError}
              />
            </Elements>

            <button
              onClick={handleBack}
              className="w-full py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back to packages
            </button>
          </div>
        )}

        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>🔒 Secure payment processing by Stripe</p>
          <p>Credits never expire</p>
        </div>
      </div>
    </div>
  );
};

export default CreditPurchaseModal;

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

      // Create payment intent using our Edge function
      const response = await createPaymentIntent(pkg.id, user.id);
      
      // Confirm payment with Stripe
      const { error } = await stripe.confirmCardPayment(response.clientSecret, {
        payment_method: {
          card: {
            // This would be a proper card element in production
            // For now, we'll simulate success
          }
        }
      });

      if (error) {
        throw error;
      }
      
      // Add credits to user account (will be handled by webhook in production)
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