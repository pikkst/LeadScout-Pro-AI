import { CompanyLead, LeadFocus } from "../types";
import { supabase } from "./supabaseClient";

const MODEL_NAME = 'gemini-3-flash-preview';

// Get Supabase URL from environment for Edge Functions
const getSupabaseUrl = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL is not set. Please configure environment variables.');
  }
  return supabaseUrl;
};

// Use Supabase Edge Function endpoint
const getProxyEndpoint = () => {
  const supabaseUrl = getSupabaseUrl();
  return `${supabaseUrl}/functions/v1/gemini-proxy`;
};

/**
 * Call Gemini API through Supabase Edge function to avoid CORS issues
 */
const callGeminiProxy = async (prompt: string, tools: any[] = [], config: any = {}) => {
  const endpoint = getProxyEndpoint();
  
  // Get Supabase session for authentication
  const { data: { session } } = await supabase.auth.getSession();
  
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error('VITE_SUPABASE_ANON_KEY is not set. Please configure environment variables.');
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'apikey': anonKey,
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
 * Returns { cities, isSpecificCity } so the caller knows the search scope.
 */
export const findMajorCities = async (
  location: string, 
  focus: LeadFocus,
  onRetry?: (attempt: number, nextDelay: number) => void
): Promise<{ cities: string[]; isSpecificCity: boolean }> => {
  return callWithRetry(async () => {
    const prompt = `
      Analyze the input "${location}".
      Determine if it is a SPECIFIC CITY or a COUNTRY / REGION.

      If it is a COUNTRY or REGION:
        Return { "type": "country", "cities": ["City1", "City2", ...] }
        List the top 15 most active cities/hubs specifically for the "${focus}" industry in ${location}.

      If it is a SPECIFIC CITY:
        Return { "type": "city", "cities": ["${location}"] }

      Return ONLY valid JSON.
    `;

    const response = await callGeminiProxy(prompt, [], {
      responseMimeType: "application/json"
    });

    const text = response.text || "{}";
    try {
      const parsed = JSON.parse(text);
      if (parsed.type === 'city') {
        return { cities: [location], isSpecificCity: true };
      }
      const cities = Array.isArray(parsed.cities) ? parsed.cities : (Array.isArray(parsed) ? parsed : []);
      return { cities: cities.length > 0 ? cities : [location], isSpecificCity: false };
    } catch (parseError) {
      console.error('Cities JSON parsing error:', parseError);
      return { cities: [location], isSpecificCity: true };
    }
  }, RATE_LIMIT.maxRetries, RATE_LIMIT.baseDelay, (attempt, error, nextDelay) => {
    if (onRetry) onRetry(attempt, nextDelay);
  });
};

/**
 * Verify email authenticity using real DNS/MX validation via Edge Function.
 * Falls back to basic format + domain match check if edge function is unavailable.
 */
export const verifyEmailAuthenticity = async (
  email: string, 
  companyName: string, 
  website: string,
  onRetry?: (attempt: number, nextDelay: number) => void
): Promise<boolean> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !anonKey) {
      // Fallback: basic format + domain check
      return basicEmailValidation(email, website);
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(`${supabaseUrl}/functions/v1/validate-emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        emails: [{ email, website, companyName }]
      })
    });

    if (!response.ok) {
      console.warn('Email validation edge function failed, using fallback');
      return basicEmailValidation(email, website);
    }

    const data = await response.json();
    if (data.success && data.results?.[0]) {
      return data.results[0].isValid;
    }
    
    return basicEmailValidation(email, website);
  } catch (error) {
    console.warn('Email validation error, using fallback:', error);
    return basicEmailValidation(email, website);
  }
};

/**
 * Verify email and return confidence score (0-100) alongside boolean.
 * Used by the lead pipeline to store confidence on each lead.
 */
export const verifyEmailWithConfidence = async (
  email: string,
  companyName: string,
  website: string,
  onRetry?: (attempt: number, nextDelay: number) => void
): Promise<{ isValid: boolean; confidence: number }> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      const valid = basicEmailValidation(email, website);
      return { isValid: valid, confidence: valid ? 40 : 0 };
    }

    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(`${supabaseUrl}/functions/v1/validate-emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        emails: [{ email, website, companyName }]
      })
    });

    if (!response.ok) {
      console.warn('Email validation edge function failed, using fallback');
      const valid = basicEmailValidation(email, website);
      return { isValid: valid, confidence: valid ? 40 : 0 };
    }

    const data = await response.json();
    if (data.success && data.results?.[0]) {
      const r = data.results[0];
      return { isValid: r.isValid, confidence: r.confidence || 0 };
    }

    const valid = basicEmailValidation(email, website);
    return { isValid: valid, confidence: valid ? 40 : 0 };
  } catch (error) {
    console.warn('Email validation error, using fallback:', error);
    const valid = basicEmailValidation(email, website);
    return { isValid: valid, confidence: valid ? 40 : 0 };
  }
};

/**
 * Basic email validation fallback: format check + domain match
 */
const basicEmailValidation = (email: string, website: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return false;
  
  const emailDomain = email.split('@')[1]?.toLowerCase() || '';
  const websiteDomain = website.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '').toLowerCase();
  
  return emailDomain === websiteDomain || 
    websiteDomain.endsWith(`.${emailDomain}`) ||
    emailDomain.endsWith(`.${websiteDomain}`);
};

// Mask email for display in logs — show only domain hint
const maskEmail = (email: string): string => {
  const parts = email.split('@');
  if (parts.length !== 2) return '***@***.***';
  const domain = parts[1];
  return `***@${domain}`;
};

// Main function - enhanced with better error handling and retry notifications
export const findLeads = async (
  location: string,
  focus: LeadFocus,
  intensity: 'standard' | 'deep',
  onProgress: (progress: number, agent?: string) => void
): Promise<CompanyLead[]> => {
  try {
    onProgress(2, '🛰️ Initializing AI agents...');
    
    // Step 1: Find major cities
    onProgress(5, `🔍 Analyzing location "${location}" — detecting whether it is a city or country...`);
    
    let cities: string[] = [];
    let isSpecificCity = false;
    try {
      const cityResult = await findMajorCities(location, focus, (attempt, nextDelay) => {
        onProgress(5, `API overloaded. Retrying city search in ${Math.round(nextDelay/1000)}s... (Attempt ${attempt})`);
      });
      cities = cityResult.cities;
      isSpecificCity = cityResult.isSpecificCity;
    } catch (error: any) {
      onProgress(5, `City search failed, using fallback: ${error.message}`);
      cities = [location];
      isSpecificCity = true;
    }
    
    // Standard: country→10 cities, city→1 city | Deep: up to 15 cities
    const cityLimit = intensity === 'standard' ? 10 : 15;
    cities = cities.slice(0, cityLimit);
    
    if (cities.length === 0) {
      cities = [location]; // Ultimate fallback
      isSpecificCity = true;
    }
    
    // Standard mode strategy info
    const isStandard = intensity === 'standard';
    if (isStandard && !isSpecificCity) {
      onProgress(8, `📍 Location type: COUNTRY/REGION — found ${cities.length} major cities: ${cities.slice(0, 5).join(', ')}${cities.length > 5 ? '...' : ''}`);
      onProgress(8, `⚡ Standard mode: scanning 1 top company per city.`);
    } else if (isStandard && isSpecificCity) {
      onProgress(8, `📍 Location type: SPECIFIC CITY — ${location}`);
      onProgress(8, `⚡ Standard mode: finding top 10 companies registered in ${location}.`);
    } else {
      onProgress(8, `📍 Location type: ${isSpecificCity ? 'SPECIFIC CITY' : 'COUNTRY/REGION'} — ${cities.length} zones identified: ${cities.slice(0, 5).join(', ')}${cities.length > 5 ? '...' : ''}`);
      onProgress(8, `🔬 Deep mode: full discovery across ${cities.length} zones.`);
    }
    
    const seenCompanies = new Set<string>();
    const masterLeads: CompanyLead[] = [];

    /**
     * Normalize company name for deduplication:
     * strips legal suffixes, lowercases, removes punctuation
     */
    const normalizeCompanyName = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/\b(oü|as|llc|ltd|inc|gmbh|sa|oy|ab|osaühing|aktsiaselts)\b/gi, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
    };

    for (let i = 0; i < cities.length; i++) {
      const city = cities[i];
      const cityProgressBase = (i / cities.length) * 70; // Reserve 70% for city scanning, 30% for batch validation
      
      onProgress(Math.round(cityProgressBase + 2), `\n🏙️ ━━━ Scanning zone ${i + 1}/${cities.length}: ${city} ━━━`);
      onProgress(Math.round(cityProgressBase + 2), `🤖 AI agent searching web for ${focus} companies in ${city}...`);
      
      let cityLeads: CompanyLead[] = [];
      try {
        // Standard + country: 1 lead per city | Standard + city: 10 leads | Deep: full search
        const leadsPerCity = isStandard && !isSpecificCity ? 1 : (isStandard && isSpecificCity ? 10 : undefined);
        cityLeads = await findCityLeads(city, location, focus, (msg) => {
          onProgress(Math.round(cityProgressBase + 3), msg);
        }, leadsPerCity);
        onProgress(Math.round(cityProgressBase + 3), `📋 AI returned ${cityLeads.length} candidate${cityLeads.length !== 1 ? 's' : ''} from ${city}`);
      } catch (error: any) {
        onProgress(Math.round(cityProgressBase + 4), `⚠️ ${city} search failed: ${error.message}. Skipping to next zone...`);
        continue; // Skip this city but continue with others
      }
      
      let cityProcessed = 0;
      for (const lead of cityLeads) {
        const domain = lead.website.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
        
        // Deduplicate by normalized company name OR domain
        if (!seenCompanies.has(normalizeCompanyName(lead.name)) && !seenCompanies.has(domain)) {
          seenCompanies.add(normalizeCompanyName(lead.name));
          seenCompanies.add(domain);
          
          onProgress(Math.round(cityProgressBase + 5), `   🏢 Found: ${lead.name} (${domain})`);
          masterLeads.push(lead);
          cityProcessed++;
        } else {
          onProgress(Math.round(cityProgressBase + 4), `   ♻️ Skipping duplicate: ${lead.name}`);
        }
      }
      
      onProgress(Math.round(cityProgressBase + 10), `✅ Zone ${city} complete — ${cityProcessed} unique leads collected. Total so far: ${masterLeads.length}.`);
    }

    // ============================================================
    // BATCH EMAIL VALIDATION — all emails at once via Edge Function
    // ============================================================
    if (masterLeads.length === 0) {
      onProgress(100, `\n⚠️ No leads found. Try a different location or category.`);
      return [];
    }

    onProgress(75, `\n📧 ━━━ BATCH EMAIL VERIFICATION ━━━`);
    onProgress(75, `🔍 Validating ${masterLeads.length} emails via server-side MX lookup...`);

    // Send all emails to validate-emails Edge Function in batches of 20
    const BATCH_SIZE = 20;
    const validationMap = new Map<string, { isValid: boolean; confidence: number }>();

    for (let batchStart = 0; batchStart < masterLeads.length; batchStart += BATCH_SIZE) {
      const batch = masterLeads.slice(batchStart, batchStart + BATCH_SIZE);
      const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(masterLeads.length / BATCH_SIZE);
      
      onProgress(75 + Math.round((batchStart / masterLeads.length) * 20), 
        `   📬 Verifying batch ${batchNum}/${totalBatches} (${batch.length} emails)...`);

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const { data: { session } } = await supabase.auth.getSession();

        const response = await fetch(`${supabaseUrl}/functions/v1/validate-emails`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey || '',
            ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({
            emails: batch.map(lead => ({
              email: lead.email,
              website: lead.website,
              companyName: lead.name
            }))
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.results) {
            for (const result of data.results) {
              validationMap.set(result.email, {
                isValid: result.isValid,
                confidence: result.confidence || 0
              });
            }
          }
        }
      } catch (batchError) {
        onProgress(80, `   ⚠️ Batch ${batchNum} validation failed, marking as unverified`);
      }

      // Small delay between batches to avoid overwhelming the Edge Function
      if (batchStart + BATCH_SIZE < masterLeads.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Apply validation results to leads
    const enrichedLeads: CompanyLead[] = masterLeads.map(lead => {
      const validation = validationMap.get(lead.email);
      const isVerified = validation?.isValid ?? false;
      const emailConfidence = validation?.confidence ?? 0;
      return { ...lead, isVerified, emailConfidence };
    });

    // Log individual results
    for (const lead of enrichedLeads) {
      const status = lead.isVerified ? '✅ VERIFIED' : '⚠️ UNVERIFIED';
      onProgress(96, `   → ${lead.name} [${status}] ${lead.emailConfidence}% — ${maskEmail(lead.email)}`);
    }

    const verified = enrichedLeads.filter(l => l.isVerified).length;
    onProgress(100, `\n🎯 ━━━ SEARCH COMPLETE ━━━`);
    onProgress(100, `📊 Total: ${enrichedLeads.length} leads | ✅ Verified: ${verified} | ⚠️ Unverified: ${enrichedLeads.length - verified}`);
    onProgress(100, `💾 Results saved — download your CSV to get full details including emails.`);
    return enrichedLeads;

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
  onUpdate: (log: string) => void,
  limit?: number
): Promise<CompanyLead[]> => {
  return callWithRetry(async () => {
    const focusPrompts: Record<LeadFocus, string> = {
      events: "professional event planning companies, concert organizers, booking agencies, or festival producers",
      investors: "venture capital firms, angel investor networks, family offices, and private equity groups that actively invest capital",
      manufacturing: "industrial manufacturing plants, factories, specialized production facilities, and B2B suppliers",
      marketing: "digital marketing agencies, branding firms, PR agencies, and creative content studios",
      tech: "software development houses, SaaS companies, AI startups, and specialized IT service providers",
      real_estate: "commercial real estate agencies, property development firms, real estate investment trusts (REITs), and luxury brokerage firms",
      healthcare: "private clinics, medical specialized centers, pharmaceutical distributors, and healthcare service providers",
      legal: "corporate law firms, legal consultancy practices, intellectual property specialists, and professional legal services"
    };

    const focusExclusions: Record<LeadFocus, string> = {
      events: "",
      investors: "Do NOT include government agencies, regional development centers, county development foundations, business support organizations, incubators, accelerators, or industry associations — only entities that directly invest money.",
      manufacturing: "",
      marketing: "",
      tech: "",
      real_estate: "",
      healthcare: "",
      legal: ""
    };

    const leadCount = limit || 10;
    const sizeInstruction = limit === 1
      ? `Find the single BIGGEST and most well-known ${focusPrompts[focus]} company registered or headquartered in ${city}, ${country}. Return exactly 1 result — the most prominent one.`
      : `Search the web and find a list of ${leadCount} unique and currently active ${focusPrompts[focus]} located in or serving ${city}, ${country}. Prioritize the BIGGEST and most established companies registered in this area.`;

    const prompt = `
      ${sizeInstruction}
      
      ${focusExclusions[focus]}

      CRITICAL RULES:
      - Only include REAL companies you can verify exist via web search.
      - Each company MUST have a working website.
      - For the email: search the company's actual website or public directories for a real contact email. If you cannot find a verified email, use the most likely format based on the company's domain (e.g., info@domain.com).
      - Do NOT repeat the same company with different domain variations.
      - Do NOT invent or hallucinate companies.
      
      For each entity, provide:
      1. Company Name (official registered name)
      2. Official Website URL (must be real and accessible)
      3. Category (specific to the industry)
      4. A real contact email found on their website or public sources
      5. 1-sentence description of what they do

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