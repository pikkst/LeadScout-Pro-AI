import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SERVICE_ROLE_KEY') ?? '',
)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 })
  }

  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    
    console.log('Received webhook event:', event.type)

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object
      const { userId, packageId, credits } = paymentIntent.metadata

      if (!userId || !credits) {
        console.error('Missing metadata in payment intent')
        return new Response('Missing metadata', { status: 400 })
      }

      // Record payment in database
      const { error: paymentError } = await supabaseClient
        .from('payments')
        .insert({
          user_id: userId,
          amount: paymentIntent.amount / 100, // Convert from cents
          currency: paymentIntent.currency.toUpperCase(),
          stripe_payment_id: paymentIntent.id,
          credits_added: parseInt(credits),
          status: 'completed',
        })

      if (paymentError) {
        console.error('Error recording payment:', paymentError)
        return new Response('Error recording payment', { status: 500 })
      }

      // Add credits to user profile
      const { error: creditError } = await supabaseClient
        .rpc('add_credits_to_user', {
          user_id: userId,
          credit_amount: parseInt(credits)
        })

      if (creditError) {
        console.error('Error adding credits:', creditError)
        // Try direct update as fallback
        const { error: updateError } = await supabaseClient
          .from('user_profiles')
          .update({ 
            credits: supabaseClient.raw('credits + ?', [parseInt(credits)])
          })
          .eq('id', userId)

        if (updateError) {
          console.error('Error updating credits:', updateError)
          return new Response('Error updating credits', { status: 500 })
        }
      }

      console.log(`Successfully added ${credits} credits to user ${userId}`)
    }

    return new Response('Webhook processed successfully', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Webhook error', { status: 400 })
  }
})