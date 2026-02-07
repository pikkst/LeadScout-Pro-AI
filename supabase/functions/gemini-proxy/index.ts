// Supabase Edge Function for Gemini API proxy
// Resolves CORS issues and provides secure API access

import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  prompt: string;
  model?: string;
  tools?: any[];
  config?: any;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Only POST method allowed')
    }

    const { prompt, model = 'gemini-3-flash-preview', tools = [], config = {} }: RequestBody = await req.json()
    
    if (!prompt) {
      throw new Error('Prompt is required')
    }

    // Get API key from environment
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not set')
    }

    console.log(`Making request to Gemini API with model: ${model}`)

    // Construct the Gemini API URL - use v1beta for stable models
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`
    
    // Prepare the request body for Gemini API
    const requestBody: any = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: config.temperature || 0.1,
        maxOutputTokens: config.maxOutputTokens || 8192,
        topP: config.topP || 0.95,
        topK: config.topK || 40,
      }
    }

    // Add thinking configuration for Gemini 3 models
    if (model.includes('gemini-3') && config.thinkingLevel) {
      requestBody.generationConfig.thinkingConfig = {
        thinkingLevel: config.thinkingLevel || 'low'
      }
    }

    // Add additional config parameters
    if (config.candidateCount) requestBody.generationConfig.candidateCount = config.candidateCount
    if (config.stopSequences) requestBody.generationConfig.stopSequences = config.stopSequences
    if (config.responseMimeType) requestBody.generationConfig.responseMimeType = config.responseMimeType

    // Add tools if provided (for search functionality)
    if (tools && tools.length > 0) {
      requestBody.tools = tools
    }

    // Make the request to Gemini API
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API Error:', errorText)
      
      let errorMessage = 'Gemini API Error'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error?.message || errorMessage
        
        // Handle specific error types
        if (errorMessage.includes('API_KEY_INVALID')) {
          errorMessage = 'API key is invalid or expired'
        } else if (errorMessage.includes('QUOTA_EXCEEDED')) {
          errorMessage = 'API quota exceeded'
        } else if (response.status === 503) {
          errorMessage = 'Service temporarily unavailable (overloaded)'
        }
      } catch (parseError) {
        console.error('Error parsing Gemini error response:', parseError)
      }

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          status: response.status,
          details: errorText,
          success: false
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const data = await response.json()
    
    // Extract text from response
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    console.log(`Successfully processed Gemini request. Response length: ${text.length}`)

    return new Response(
      JSON.stringify({
        text,
        fullResponse: data,
        success: true
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error', 
        success: false,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})