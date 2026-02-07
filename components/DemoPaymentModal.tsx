import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface DemoPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageId: string;
}

const DemoPaymentModal: React.FC<DemoPaymentModalProps> = ({ isOpen, onClose, packageId }) => {
  const { updateCredits } = useAuth();
  const [processing, setProcessing] = useState(false);

  if (!isOpen) return null;

  const packages = {
    starter: { credits: 1, price: 5 },
    basic: { credits: 5, price: 20 },
    premium: { credits: 20, price: 70 }
  };

  const selectedPackage = packages[packageId as keyof typeof packages];

  const handleDemoPayment = async () => {
    setProcessing(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Add credits to user account
    await updateCredits(selectedPackage.credits);
    
    setProcessing(false);
    onClose();
    
    alert(`Demo payment successful! Added ${selectedPackage.credits} credits to your account.`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Demo Payment</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={processing}
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-600">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Demo Mode
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  This is a demo payment. No real money will be charged.
                </div>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Package: {packageId.charAt(0).toUpperCase() + packageId.slice(1)}</h3>
            <div className="flex justify-between items-center mb-2">
              <span>Credits:</span>
              <span className="font-semibold">{selectedPackage.credits}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Price:</span>
              <span className="font-semibold">€{selectedPackage.price}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleDemoPayment}
          disabled={processing}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? 'Processing Demo Payment...' : 'Complete Demo Payment'}
        </button>

        <p className="text-xs text-gray-500 mt-4 text-center">
          This is a demo payment system. In production, this would integrate with real Stripe payments.
        </p>
      </div>
    </div>
  );
};

export default DemoPaymentModal;