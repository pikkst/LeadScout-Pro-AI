import { GoogleGenAI, Type } from "@google/genai";
import { CompanyLead, LeadFocus } from "../types";

const MODEL_NAME = 'gemini-3-flash-preview';

/**
 * Utility to handle API calls with exponential backoff retries.
 * Particularly useful for 503 (Overloaded) and 429 (Rate Limit) errors.
 */
async function callWithRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 2000,
  onRetry?: (attempt: number, error: any) => void
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const isRetryable = 
      error?.message?.includes('503') || 
      error?.message?.includes('429') || 
      error?.message?.includes('overloaded') ||
      error?.message?.includes('rate limit');

    if (isRetryable && retries > 0) {
      if (onRetry) onRetry(4 - retries, error);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(operation, retries - 1, delay * 2, onRetry);
    }
    throw error;
  }
}

/**
 * Identify major cities for a given country/region to break down the search.
 */
export const findMajorCities = async (location: string, focus: LeadFocus): Promise<string[]> => {
  return callWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyCKCmMWjJiCEDi5fMXJn7c7jLM-Ih-Q0os' });
    const prompt = `
      Analyze if the input "${location}" is a country or region. 
      List the top 15 most active cities/hubs specifically for the "${focus}" industry in ${location}.
      If it is already a specific city, return just that city name in the array.
      
      Return ONLY a JSON array of strings: ["City1", "City2", ...]
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "[]";
    try {
      const cities = JSON.parse(text);
      return Array.isArray(cities) ? cities : [];
    } catch (parseError) {
      console.error('Cities JSON parsing error:', parseError);
      return [];
    }
  });
};

/**
 * Perform deep verification of an email using search grounding.
 */
export const verifyEmailAuthenticity = async (
  email: string, 
  companyName: string, 
  website: string,
  onRetry?: (attempt: number) => void
): Promise<boolean> => {
  return callWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyCKCmMWjJiCEDi5fMXJn7c7jLM-Ih-Q0os' });
    const prompt = `
      Verification Mission: Determine if the email "${email}" is a legitimate business contact for "${companyName}" (${website}).
      
      Steps:
      1. Search for this specific email on the official domain ${website}.
      2. Check professional directories (LinkedIn, ZoomInfo, Apollo, Yelp) for recent mentions of this contact at this company.
      3. Verify if the domain part of the email matches the website.
      
      Return ONLY a JSON object: {"isAuthentic": true/false, "confidence": 0-100, "reason": "..."}
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      },
    });

    const result = JSON.parse(response.text || "{}");
    return result.isAuthentic === true && (result.confidence || 0) >= 60;
  }, 3, 3000, onRetry);
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

// Main function - copy original App.tsx logic exactly
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
    let cities = await findMajorCities(location, focus);
    
    const cityLimit = intensity === 'standard' ? 5 : 15;
    cities = cities.slice(0, cityLimit);
    
    onProgress(8, `Fleet deployment confirmed for ${cities.length} zones.`);
    
    const uniqueWebsites = new Set<string>();
    const masterLeads: CompanyLead[] = [];

    for (let i = 0; i < cities.length; i++) {
      const city = cities[i];
      const cityProgressBase = (i / cities.length) * 90;
      
      onProgress(Math.round(cityProgressBase + 2), `Scouting: ${city}`);
      
      const cityLeads = await findCityLeads(city, location, focus, (msg) => {
        // onProgress can handle internal logs  
      });
      
      let cityProcessed = 0;
      for (const lead of cityLeads) {
        const domain = lead.website.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
        
        if (!uniqueWebsites.has(domain)) {
          uniqueWebsites.add(domain);
          
          // To prevent 503 Overloaded, we stagger requests slightly
          await new Promise(resolve => setTimeout(resolve, 800));

          const isAlive = await checkDomainPulse(lead.website);
          const isAuthentic = await verifyEmailAuthenticity(
            lead.email, 
            lead.name, 
            lead.website,
            (attempt) => onProgress(Math.round(cityProgressBase + 5), `Load high. Retrying authentication (Attempt ${attempt})...`)
          );

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
    throw err;
  }
};

// City search function - copy from original
const findCityLeads = async (
  city: string,
  country: string,
  focus: LeadFocus,
  onUpdate: (log: string) => void
): Promise<CompanyLead[]> => {
  return callWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyCKCmMWjJiCEDi5fMXJn7c7jLM-Ih-Q0os' });
    
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

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
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
        console.error('JSON parsing error:', parseError);
      }
    }
    return [];
  }, 3, 4000);
};