import { CompanyLead, LeadFocus } from "../types";
import { supabase } from "./supabaseClient";

const MODEL_NAME = 'gemini-1.5-flash';

// Get Supabase URL from environment for Edge Functions
const getSupabaseUrl = () => {
  return import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
};

// Use Supabase Edge Function endpoint
const getProxyEndpoint = () => {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL environment variable is not set');
  }
  return `${supabaseUrl}/functions/v1/gemini-proxy`;
};

/**
 * Call Gemini API through Supabase Edge function to avoid CORS issues
 */
const callGeminiProxy = async (prompt: string, tools: any[] = [], config: any = {}) => {
  const endpoint = getProxyEndpoint();
  
  // Get Supabase session for authentication
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  };

  // Add authorization header if user is authenticated
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt,
      model: MODEL_NAME,
      tools,
      config
    })
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    // Enhanced error handling for different error types
    const errorMessage = data.error || 'Unknown proxy error';
    
    // Check for specific error types and provide user-friendly messages
    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('expired')) {
      throw new Error('API key has expired or is invalid. Please check your configuration.');
    }
    if (errorMessage.includes('QUOTA_EXCEEDED')) {
      throw new Error('API quota exceeded. Please check your billing or wait before retrying.');
    }
    if (errorMessage.includes('overloaded') || response.status === 503) {
      throw new Error('Google AI service is overloaded. Please try again later.');
    }
    if (errorMessage.includes('VITE_SUPABASE_URL')) {
      throw new Error('Supabase configuration error. Please check environment variables.');
    }
    
    throw new Error(`Proxy error: ${errorMessage}`);
  }

  return data;
};

// Rate limiting configuration
const RATE_LIMIT = {
  requestsPerMinute: 15,
  queueSize: 50,
  baseDelay: 4000, // 4 seconds base delay
  maxDelay: 30000, // 30 seconds max delay
  maxRetries: 5
};

// Request queue management
let requestQueue: Array<{ resolve: Function, reject: Function, operation: Function }> = [];
let activeRequests = 0;
let lastRequestTime = 0;

// Circuit breaker for handling repeated failures
let circuitBreaker = {
  failures: 0,
  lastFailureTime: 0,
  isOpen: false,
  openUntil: 0
};

/**
 * Circuit breaker check - prevents overwhelming API when it's consistently failing
 */
const checkCircuitBreaker = (): boolean => {
  const now = Date.now();
  
  // Reset circuit breaker if enough time has passed
  if (circuitBreaker.isOpen && now > circuitBreaker.openUntil) {
    circuitBreaker.isOpen = false;
    circuitBreaker.failures = 0;
  }
  
  // Check if circuit should be opened
  if (circuitBreaker.failures >= 10 && (now - circuitBreaker.lastFailureTime) < 60000) {
    circuitBreaker.isOpen = true;
    circuitBreaker.openUntil = now + 120000; // Open for 2 minutes
  }
  
  return !circuitBreaker.isOpen;
};

/**
 * Record API failure for circuit breaker
 */
const recordFailure = () => {
  circuitBreaker.failures++;
  circuitBreaker.lastFailureTime = Date.now();
};

/**
 * Record API success for circuit breaker
 */
const recordSuccess = () => {
  circuitBreaker.failures = Math.max(0, circuitBreaker.failures - 1);
};

/**
 * Enhanced error message formatting for better user experience
 */
const formatApiError = (error: any): string => {
  const errorStr = error?.message?.toLowerCase() || '';
  
  if (errorStr.includes('503') || errorStr.includes('overloaded')) {
    return "Google's AI service is experiencing high demand. We're automatically retrying your request...";
  }
  if (errorStr.includes('429') || errorStr.includes('rate limit')) {
    return "Rate limit reached. Taking a brief pause before continuing...";
  }
  if (errorStr.includes('unavailable') || errorStr.includes('timeout')) {
    return "Service temporarily unavailable. Retrying with backup strategy...";
  }
  if (errorStr.includes('quota') || errorStr.includes('billing')) {
    return "API quota exceeded. Please check your billing settings.";
  }
  
  return error?.message || 'Unknown API error occurred';
};

/**
 * Rate limiter to prevent overwhelming the API
 */
async function rateLimitedRequest<T>(operation: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    if (requestQueue.length >= RATE_LIMIT.queueSize) {
      reject(new Error('Request queue is full. Please try again later.'));
      return;
    }

    requestQueue.push({ resolve, reject, operation });
    processQueue();
  });
}

/**
 * Process the request queue with rate limiting
 */
async function processQueue() {
  if (activeRequests >= RATE_LIMIT.requestsPerMinute || requestQueue.length === 0) {
    return;
  }

  const timeSinceLastRequest = Date.now() - lastRequestTime;
  const minInterval = (60 * 1000) / RATE_LIMIT.requestsPerMinute; // Spread requests over a minute

  if (timeSinceLastRequest < minInterval) {
    setTimeout(processQueue, minInterval - timeSinceLastRequest);
    return;
  }

  const { resolve, reject, operation } = requestQueue.shift()!;
  activeRequests++;
  lastRequestTime = Date.now();

  try {
    const result = await operation();
    resolve(result);
  } catch (error) {
    reject(error);
  } finally {
    activeRequests--;
    // Process next request after a small delay
    setTimeout(processQueue, 1000);
  }
}

/**
 * Enhanced utility to handle API calls with exponential backoff retries and better error detection.
 * Includes jitter to prevent thundering herd problems and circuit breaker for repeated failures.
 */
async function callWithRetry<T>(
  operation: () => Promise<T>,
  retries = RATE_LIMIT.maxRetries,
  delay = RATE_LIMIT.baseDelay,
  onRetry?: (attempt: number, error: any, nextDelay: number) => void
): Promise<T> {
  // Check circuit breaker
  if (!checkCircuitBreaker()) {
    const waitTime = Math.max(0, circuitBreaker.openUntil - Date.now());
    throw new Error(`Service temporarily suspended due to repeated failures. Please try again in ${Math.round(waitTime/1000)} seconds.`);
  }

  try {
    const result = await rateLimitedRequest(operation);
    recordSuccess(); // Record successful API call
    return result;
  } catch (error: any) {
    recordFailure(); // Record failed API call
    
    const errorStr = error?.message?.toLowerCase() || '';
    const isRetryable = 
      errorStr.includes('503') || 
      errorStr.includes('429') || 
      errorStr.includes('overloaded') ||
      errorStr.includes('rate limit') ||
      errorStr.includes('unavailable') ||
      errorStr.includes('timeout') ||
      errorStr.includes('temporarily unavailable') ||
      error?.code === 503 ||
      error?.code === 429 ||
      error?.status === 'UNAVAILABLE';

    if (isRetryable && retries > 0) {
      // Add jitter (random factor) to prevent thundering herd
      const jitter = Math.random() * 1000;
      const nextDelay = Math.min(delay + jitter, RATE_LIMIT.maxDelay);
      
      if (onRetry) {
        onRetry(RATE_LIMIT.maxRetries - retries + 1, error, nextDelay);
      }
      
      console.log(`API error: ${formatApiError(error)}. Retrying in ${Math.round(nextDelay/1000)}s... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, nextDelay));
      
      // Exponential backoff with jitter
      return callWithRetry(operation, retries - 1, Math.min(delay * 1.8, RATE_LIMIT.maxDelay), onRetry);
    }
    
    // Enhanced error message for better debugging
    const enhancedError = new Error(formatApiError(error));
    throw enhancedError;
  }
}

/**
 * Get the current status of the Gemini service for monitoring
 */
export const getServiceStatus = () => ({
  queueLength: requestQueue.length,
  activeRequests,
  circuitBreakerOpen: circuitBreaker.isOpen,
  recentFailures: circuitBreaker.failures,
  isHealthy: !circuitBreaker.isOpen && requestQueue.length < RATE_LIMIT.queueSize * 0.8
});

/**
 * Identify major cities for a given country/region to break down the search.
 */
export const findMajorCities = async (
  location: string, 
  focus: LeadFocus,
  onRetry?: (attempt: number, nextDelay: number) => void
): Promise<string[]> => {
  return callWithRetry(async () => {
    const prompt = `
      Analyze if the input "${location}" is a country or region. 
      List the top 15 most active cities/hubs specifically for the "${focus}" industry in ${location}.
      If it is already a specific city, return just that city name in the array.
      
      Return ONLY a JSON array of strings: ["City1", "City2", ...]
    `;

    const response = await callGeminiProxy(prompt, [], {
      responseMimeType: "application/json"
    });

    const text = response.text || "[]";
    try {
      const cities = JSON.parse(text);
      return Array.isArray(cities) ? cities : [];
    } catch (parseError) {
      console.error('Cities JSON parsing error:', parseError);
      return [location]; // Fallback to original location if parsing fails
    }
  }, RATE_LIMIT.maxRetries, RATE_LIMIT.baseDelay, (attempt, error, nextDelay) => {
    if (onRetry) onRetry(attempt, nextDelay);
  });
};

/**
 * Perform deep verification of an email using search grounding.
 */
export const verifyEmailAuthenticity = async (
  email: string, 
  companyName: string, 
  website: string,
  onRetry?: (attempt: number, nextDelay: number) => void
): Promise<boolean> => {
  return callWithRetry(async () => {
    const prompt = `
      Verification Mission: Determine if the email "${email}" is a legitimate business contact for "${companyName}" (${website}).
      
      Steps:
      1. Search for this specific email on the official domain ${website}.
      2. Check professional directories (LinkedIn, ZoomInfo, Apollo, Yelp) for recent mentions of this contact at this company.
      3. Verify if the domain part of the email matches the website.
      
      Return ONLY a JSON object: {"isAuthentic": true/false, "confidence": 0-100, "reason": "..."}
    `;

    const response = await callGeminiProxy(prompt, [{ googleSearch: {} }], {
      responseMimeType: "application/json"
    });

    const result = JSON.parse(response.text || "{}");
    return result.isAuthentic === true && (result.confidence || 0) >= 60;
  }, RATE_LIMIT.maxRetries, RATE_LIMIT.baseDelay, (attempt, error, nextDelay) => {
    if (onRetry) onRetry(attempt, nextDelay);
  });
};

// Domain pulse check - copy from original
const checkDomainPulse = async (url: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000);
    await fetch(url, { mode: 'no-cors', signal: controller.signal });
    clearTimeout(id);
    return true;
  } catch {
    return false;
  }
};

// Main function - enhanced with better error handling and retry notifications
export const findLeads = async (
  location: string,
  focus: LeadFocus,
  intensity: 'standard' | 'deep',
  onProgress: (progress: number, agent?: string) => void
): Promise<CompanyLead[]> => {
  try {
    onProgress(2, 'Strategic Planning');
    
    // Step 1: Find major cities
    onProgress(5, `Identifying high-activity hubs for "${focus}" sector in ${location}...`);
    
    let cities: string[] = [];
    try {
      cities = await findMajorCities(location, focus, (attempt, nextDelay) => {
        onProgress(5, `API overloaded. Retrying city search in ${Math.round(nextDelay/1000)}s... (Attempt ${attempt})`);
      });
    } catch (error: any) {
      onProgress(5, `City search failed, using fallback: ${error.message}`);
      cities = [location]; // Fallback to original location
    }
    
    const cityLimit = intensity === 'standard' ? 5 : 15;
    cities = cities.slice(0, cityLimit);
    
    if (cities.length === 0) {
      cities = [location]; // Ultimate fallback
    }
    
    onProgress(8, `Fleet deployment confirmed for ${cities.length} zones.`);
    
    const uniqueWebsites = new Set<string>();
    const masterLeads: CompanyLead[] = [];

    for (let i = 0; i < cities.length; i++) {
      const city = cities[i];
      const cityProgressBase = (i / cities.length) * 90;
      
      onProgress(Math.round(cityProgressBase + 2), `Scouting: ${city}`);
      
      let cityLeads: CompanyLead[] = [];
      try {
        cityLeads = await findCityLeads(city, location, focus, (msg) => {
          onProgress(Math.round(cityProgressBase + 3), msg);
        });
      } catch (error: any) {
        onProgress(Math.round(cityProgressBase + 4), `${city} search failed: ${error.message}. Continuing with next city...`);
        continue; // Skip this city but continue with others
      }
      
      let cityProcessed = 0;
      for (const lead of cityLeads) {
        const domain = lead.website.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
        
        if (!uniqueWebsites.has(domain)) {
          uniqueWebsites.add(domain);
          
          // Enhanced delay between requests to reduce API pressure
          await new Promise(resolve => setTimeout(resolve, 2000));

          const isAlive = await checkDomainPulse(lead.website);
          
          let isAuthentic = false;
          try {
            isAuthentic = await verifyEmailAuthenticity(
              lead.email, 
              lead.name, 
              lead.website,
              (attempt, nextDelay) => {
                onProgress(
                  Math.round(cityProgressBase + 5), 
                  `API overloaded. Retrying email verification in ${Math.round(nextDelay/1000)}s... (Attempt ${attempt})`
                );
              }
            );
          } catch (verifyError: any) {
            onProgress(Math.round(cityProgressBase + 5), `Email verification failed for ${lead.name}, marking as unverified`);
            isAuthentic = false; // Continue but mark as unverified
          }

          const enrichedLead = { ...lead, isVerified: isAlive && isAuthentic };
          
          masterLeads.push(enrichedLead);
          cityProcessed++;
        }
      }
      
      onProgress(Math.round(cityProgressBase + 10), `Zone ${city} complete. Collected ${cityProcessed} unique verified leads.`);
    }

    onProgress(100, `Successfully captured ${masterLeads.length} unique B2B leads.`);
    return masterLeads;

  } catch (err: any) {
    const errorMsg = err?.message || 'Unknown orbital failure';
    onProgress(0, `Mission compromised: ${errorMsg}`);
    console.error('FindLeads critical error:', err);
    throw err;
  }
};

// City search function - enhanced with proxy and better retry handling
const findCityLeads = async (
  city: string,
  country: string,
  focus: LeadFocus,
  onUpdate: (log: string) => void
): Promise<CompanyLead[]> => {
  return callWithRetry(async () => {
    const focusPrompts: Record<LeadFocus, string> = {
      events: "professional event planning companies, concert organizers, booking agencies, or festival producers",
      investors: "venture capital firms, angel investor networks, family offices, and private equity groups",
      manufacturing: "industrial manufacturing plants, factories, specialized production facilities, and B2B suppliers",
      marketing: "digital marketing agencies, branding firms, PR agencies, and creative content studios",
      tech: "software development houses, SaaS companies, AI startups, and specialized IT service providers",
      real_estate: "commercial real estate agencies, property development firms, real estate investment trusts (REITs), and luxury brokerage firms",
      healthcare: "private clinics, medical specialized centers, pharmaceutical distributors, and healthcare service providers",
      legal: "corporate law firms, legal consultancy practices, intellectual property specialists, and professional legal services"
    };

    const prompt = `
      Find a list of at least 10 unique and active ${focusPrompts[focus]} located in or serving ${city}, ${country}.
      
      For each entity, provide:
      1. Company Name
      2. Official Website URL
      3. Category (specific to the industry)
      4. A professional contact email (e.g., info@, hello@, office@, or a specific department).
      5. 1-sentence description.

      Format strictly as a JSON array: 
      [{"name": "...", "website": "...", "category": "...", "email": "...", "description": "..."}]
    `;

    const response = await callGeminiProxy(prompt, [{ googleSearch: {} }], {
      temperature: 0.1
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch && jsonMatch[0]) {
      try {
        const parsedData = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsedData)) {
          return parsedData.map((lead: any, index: number) => ({
            ...lead,
            id: `lead-${city}-${Date.now()}-${index}`
          }));
        }
      } catch (parseError) {
        console.error('JSON parsing error for city leads:', parseError);
        onUpdate(`JSON parsing failed for ${city}, returning empty results`);
      }
    }
    onUpdate(`No valid leads found for ${city}`);
    return [];
  }, RATE_LIMIT.maxRetries, RATE_LIMIT.baseDelay, (attempt, error, nextDelay) => {
    onUpdate(`API overloaded for ${city}. Retrying in ${Math.round(nextDelay/1000)}s... (Attempt ${attempt})`);
  });
};