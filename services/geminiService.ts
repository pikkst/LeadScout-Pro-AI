import { CompanyLead, LeadFocus } from "../types";
import { api } from "./apiClient";

export interface GeneratedPitch {
  subject: string;
  htmlContent: string;
  textContent: string;
  detectedLanguage: string;
}

/**
 * Identify major cities for a given country/region (authenticated AI endpoint).
 */
export const findMajorCities = async (location: string, focus: LeadFocus): Promise<string[]> => {
  return api<string[]>("/ai/cities", {
    method: "POST",
    body: JSON.stringify({ location, focus }),
  });
};

/**
 * Deep verification of a business email (authenticated AI endpoint).
 */
export const verifyEmailAuthenticity = async (
  email: string,
  companyName: string,
  website: string,
  _onRetry?: (attempt: number) => void,
): Promise<boolean> => {
  const data = await api<{ isAuthentic: boolean }>("/ai/verify", {
    method: "POST",
    body: JSON.stringify({ email, companyName, website }),
  });
  return data.isAuthentic;
};

/**
 * Find wholesale/B2B leads for a city (authenticated AI endpoint).
 */
export const findLeads = async (
  city: string,
  country: string,
  focus: LeadFocus,
  onUpdate?: (log: string) => void,
): Promise<CompanyLead[]> => {
  if (onUpdate) onUpdate(`Initiating server-side wholesale lookup for ${city}...`);
  return api<CompanyLead[]>("/ai/leads", {
    method: "POST",
    body: JSON.stringify({ city, country, focus }),
  });
};

/**
 * Generate a personalized B2B outreach pitch (authenticated AI endpoint).
 */
export const generatePersonalizedPitch = async (
  lead: CompanyLead,
  focus: LeadFocus,
  preferredLanguage: string,
): Promise<GeneratedPitch> => {
  return api<GeneratedPitch>("/ai/pitch", {
    method: "POST",
    body: JSON.stringify({
      lead: {
        name: lead.name,
        category: lead.category,
        website: lead.website,
        description: lead.description,
      },
      focus,
      preferredLanguage,
    }),
  });
};
