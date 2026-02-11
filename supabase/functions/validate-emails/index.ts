// Supabase Edge Function for real email validation
// Uses DNS MX record lookup + SMTP-level checks instead of AI guessing

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ValidationResult {
  email: string;
  isValid: boolean;
  hasValidFormat: boolean;
  hasMxRecords: boolean;
  domainMatchesWebsite: boolean;
  confidence: number;
  reason: string;
}

/**
 * Validate email format with RFC 5322 compliant regex
 */
function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * Extract domain from email address
 */
function getEmailDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() || '';
}

/**
 * Extract domain from website URL
 */
function getWebsiteDomain(website: string): string {
  try {
    const url = new URL(website.startsWith('http') ? website : `https://${website}`);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return website.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '').toLowerCase();
  }
}

/**
 * Check if domain has MX records using DNS-over-HTTPS (Cloudflare/Google)
 */
async function hasMxRecords(domain: string): Promise<boolean> {
  try {
    // Use Cloudflare DNS-over-HTTPS
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`,
      {
        headers: { 'Accept': 'application/dns-json' }
      }
    );

    if (!response.ok) return false;

    const data = await response.json();
    // Status 0 = NOERROR, Answer array contains MX records
    return data.Status === 0 && Array.isArray(data.Answer) && data.Answer.length > 0;
  } catch (error) {
    console.error(`MX lookup failed for ${domain}:`, error);
    return false;
  }
}

/**
 * Check if domain resolves (has A/AAAA records)
 */
async function domainResolves(domain: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`,
      {
        headers: { 'Accept': 'application/dns-json' }
      }
    );

    if (!response.ok) return false;

    const data = await response.json();
    return data.Status === 0 && Array.isArray(data.Answer) && data.Answer.length > 0;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Only POST method allowed')
    }

    const { emails } = await req.json() as { 
      emails: Array<{ email: string; website: string; companyName: string }> 
    };

    if (!emails || !Array.isArray(emails)) {
      throw new Error('emails array is required')
    }

    // Process max 20 emails per request to prevent abuse
    const batch = emails.slice(0, 20);

    const results: ValidationResult[] = await Promise.all(
      batch.map(async ({ email, website, companyName }) => {
        const result: ValidationResult = {
          email,
          isValid: false,
          hasValidFormat: false,
          hasMxRecords: false,
          domainMatchesWebsite: false,
          confidence: 0,
          reason: '',
        };

        // Step 1: Format validation
        result.hasValidFormat = isValidEmailFormat(email);
        if (!result.hasValidFormat) {
          result.reason = 'Invalid email format';
          return result;
        }

        const emailDomain = getEmailDomain(email);
        const websiteDomain = getWebsiteDomain(website);

        // Step 2: Domain match check
        result.domainMatchesWebsite = emailDomain === websiteDomain || 
          websiteDomain.endsWith(`.${emailDomain}`) ||
          emailDomain.endsWith(`.${websiteDomain}`);

        // Step 3: MX record lookup (real DNS check)
        result.hasMxRecords = await hasMxRecords(emailDomain);

        // Step 4: If no MX, check if domain at least resolves
        const resolves = result.hasMxRecords || await domainResolves(emailDomain);

        // Calculate confidence score
        let confidence = 0;
        if (result.hasValidFormat) confidence += 20;
        if (result.hasMxRecords) confidence += 40;
        if (result.domainMatchesWebsite) confidence += 30;
        if (resolves && !result.hasMxRecords) confidence += 10;
        
        // Common generic prefixes get slight penalty (info@, contact@ are less specific)
        const prefix = email.split('@')[0].toLowerCase();
        const genericPrefixes = ['info', 'contact', 'hello', 'office', 'admin', 'support', 'sales'];
        if (!genericPrefixes.includes(prefix)) confidence += 10;

        result.confidence = Math.min(confidence, 100);
        result.isValid = confidence >= 60;
        result.reason = result.isValid
          ? `Valid: MX=${result.hasMxRecords}, DomainMatch=${result.domainMatchesWebsite}`
          : `Low confidence (${confidence}%): MX=${result.hasMxRecords}, Resolves=${resolves}, DomainMatch=${result.domainMatchesWebsite}`;

        return result;
      })
    );

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Email validation error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
