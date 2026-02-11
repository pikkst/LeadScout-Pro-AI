import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    console.error('Missing required environment variables')
    return new Response('Server configuration error', { status: 500 })
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  })

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
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

      const creditAmount = parseInt(credits)

      // Record payment in database
      const { error: paymentError } = await supabaseAdmin
        .from('payments')
        .insert({
          user_id: userId,
          amount: paymentIntent.amount / 100, // Convert from cents
          currency: paymentIntent.currency.toUpperCase(),
          stripe_payment_id: paymentIntent.id,
          credits_added: creditAmount,
          status: 'completed',
        })

      if (paymentError) {
        console.error('Error recording payment:', paymentError)
        return new Response('Error recording payment', { status: 500 })
      }

      // Add credits using secure database function
      const { error: creditError } = await supabaseAdmin
        .rpc('add_credits_to_user', {
          target_user_id: userId,
          credit_amount: creditAmount
        })

      if (creditError) {
        console.error('Error adding credits via RPC:', creditError)
        // Fallback: direct SQL update 
        const { error: updateError } = await supabaseAdmin
          .rpc('add_credits_fallback', {
            target_user_id: userId,
            credit_amount: creditAmount
          })

        if (updateError) {
          console.error('Fallback credit update also failed:', updateError)
          return new Response('Error updating credits', { status: 500 })
        }
      }

      console.log(`Successfully added ${creditAmount} credits to user ${userId}`)
    }

    return new Response('Webhook processed successfully', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Webhook error', { status: 400 })
  }
})