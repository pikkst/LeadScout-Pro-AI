import { CompanyLead, LeadFocus } from "../types";

export interface GeneratedPitch {
  subject: string;
  htmlContent: string;
  textContent: string;
  detectedLanguage: string;
}

/**
 * Identify major cities for a given country/region by proxying to the backend.
 */
export const findMajorCities = async (location: string, focus: LeadFocus): Promise<string[]> => {
  const response = await fetch("/api/cities", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ location, focus }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch major cities from server");
  }

  return response.json();
};

/**
 * Perform deep verification of an email by proxying to the backend.
 */
export const verifyEmailAuthenticity = async (
  email: string, 
  companyName: string, 
  website: string,
  onRetry?: (attempt: number) => void
): Promise<boolean> => {
  const response = await fetch("/api/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, companyName, website }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to verify email from server");
  }

  const data = await response.json();
  return data.isAuthentic;
};

/**
 * Find wholesale leads by proxying to the backend.
 */
export const findLeads = async (
  city: string,
  country: string,
  focus: LeadFocus,
  onUpdate?: (log: string) => void
): Promise<CompanyLead[]> => {
  if (onUpdate) onUpdate(`Initiating server-side wholesale lookup for ${city}...`);
  
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ city, country, focus }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to find leads from server");
  }

  return response.json();
};

/**
 * Generate a personalized B2B outreach pitch by proxying to the backend.
 */
export const generatePersonalizedPitch = async (
  lead: CompanyLead,
  focus: LeadFocus,
  preferredLanguage: string
): Promise<GeneratedPitch> => {
  const response = await fetch("/api/pitch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ lead, focus, preferredLanguage }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to generate pitch from server");
  }

  return response.json();
};
