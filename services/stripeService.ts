import { loadStripe, Stripe } from '@stripe/stripe-js';

// Add a fallback public key for testing purposes
// In production, replace with your actual Stripe publishable key
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_51OWCcKLMEQJzZdGj8pL9x2nR4fG5H9yJ3bN8mG1xF2dK5qH6uE8wQ9tR7vY3sU2cZ1pL4oF8qW6eR9tY5uI7mO00EXAMPLE';

console.log('Stripe Config:', { 
  key: stripePublicKey ? 'Set' : 'Missing'
});

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

  // Call our Supabase Edge Function
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://levkpmoensvpteltohsd.supabase.co';
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxldmtwbW9lbnN2cHRlbHRvaHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NjU5OTgsImV4cCI6MjA4NjA0MTk5OH0.QdAAS86SxUzZYnw88ywEM8aMO0vxvQL1-oHBSTP2Sso';
  
  console.log('Payment URL:', `${supabaseUrl}/functions/v1/create-payment-intent`);
  
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