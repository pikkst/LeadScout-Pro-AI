import { loadStripe, Stripe } from '@stripe/stripe-js';

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

if (!stripePublicKey) {
  console.warn('Stripe public key is not set');
}

let stripePromise: Promise<Stripe | null>;

const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublicKey || '');
  }
  return stripePromise;
};

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  pricePerCredit: number;
  popular?: boolean;
}

export const creditPackages: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 1,
    price: 5,
    pricePerCredit: 5.00
  },
  {
    id: 'professional',
    name: 'Professional Pack',
    credits: 10,
    price: 40,
    pricePerCredit: 4.00,
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise Pack',
    credits: 25,
    price: 75,
    pricePerCredit: 3.00
  }
];

export const createPaymentIntent = async (packageId: string, userId: string) => {
  const selectedPackage = creditPackages.find(pkg => pkg.id === packageId);
  if (!selectedPackage) {
    throw new Error('Invalid package selected');
  }

  // This would typically call your backend API
  // For now, we'll simulate the response
  const response = await fetch('/api/create-payment-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      packageId,
      userId,
      amount: selectedPackage.price * 100, // Convert to cents
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create payment intent');
  }

  return response.json();
};

export default getStripe;