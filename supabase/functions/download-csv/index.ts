// Supabase Edge Function for secure CSV download with credit deduction
// Credits are deducted server-side to prevent client-side manipulation

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Only POST method allowed')
    }

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authentication required')
    }

    // Create Supabase client with service role for credit operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Create client with user's JWT for identity verification
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify the user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      throw new Error('Invalid authentication token')
    }

    const { queryId } = await req.json()
    if (!queryId) {
      throw new Error('queryId is required')
    }

    // Use the secure database function to atomically deduct credit and mark download
    const { data: result, error: rpcError } = await supabaseAdmin
      .rpc('deduct_credit_for_download', {
        target_user_id: user.id,
        target_query_id: queryId
      })

    if (rpcError) {
      console.error('RPC error:', rpcError)
      throw new Error('Failed to process download')
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error 
        }),
        { 
          status: 402, // Payment Required
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Fetch the query results for the user
    const { data: queryData, error: queryError } = await supabaseAdmin
      .from('query_history')
      .select('results, location, focus')
      .eq('id', queryId)
      .eq('user_id', user.id)
      .single()

    if (queryError || !queryData) {
      throw new Error('Query not found')
    }

    // Generate CSV server-side
    const leads = queryData.results || []
    const headers = ["Name", "Category", "Email", "Email Confidence", "Website", "Description", "Verified"]
    const rows = leads.map((l: any) => [
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${(l.category || '').replace(/"/g, '""')}"`,
      `"${(l.email || '').replace(/"/g, '""')}"`,
      `${l.emailConfidence || 0}%`,
      `"${(l.website || '').replace(/"/g, '""')}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`,
      l.isVerified ? 'Yes' : 'No'
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((r: string[]) => r.join(","))
    ].join("\n")

    return new Response(
      JSON.stringify({
        success: true,
        csv: csvContent,
        filename: `leads_${queryData.focus}_${queryData.location.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`,
        remaining_credits: result.remaining_credits
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Download edge function error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error', 
        success: false 
      }),
      { 
        status: error.message?.includes('Authentication') ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
