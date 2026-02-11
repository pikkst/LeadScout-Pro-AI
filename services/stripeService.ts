import { loadStripe, Stripe } from '@stripe/stripe-js';

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

if (!stripePublicKey) {
  console.error('VITE_STRIPE_PUBLIC_KEY is not set. Payments will not work.');
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

  // Call our Supabase Edge Function
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured');
  }
  
  const response = await fetch(`${supabaseUrl}/functions/v1/create-payment-intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      packageId,
      userId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create payment intent');
  }

  return response.json();
};

export default getStripe;