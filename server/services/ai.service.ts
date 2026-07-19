// AI service: encapsulates all Google Gemini interactions used by the platform.
import { GoogleGenAI } from "@google/genai";
import { HttpError } from "../utils/httpError";
import { getAiSettings } from "./settings.service";

let client: GoogleGenAI | null = null;
let clientKey = "";

async function getAI(): Promise<{ ai: GoogleGenAI; model: string }> {
  const { apiKey, model } = await getAiSettings();
  if (!apiKey) {
    throw new HttpError(
      503,
      "AI features are unavailable: no Gemini API key is configured. Add it in Settings → AI.",
      "AI_UNCONFIGURED",
    );
  }
  // Rebuild the client if the key changed via Settings.
  if (!client || clientKey !== apiKey) {
    client = new GoogleGenAI({ apiKey });
    clientKey = apiKey;
  }
  return { ai: client, model };
}

/** Extract the first JSON value (object or array) from a possibly noisy model response. */
function extractJson<T>(text: string, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/[[{][\s\S]*[\]}]/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}

const FOCUS_LEAD_PROMPTS: Record<string, string> = {
  voip_carriers:
    "telecom wholesale carriers, international voice operators, retail VoIP providers, Tier-2/Tier-3 carrier transit firms, and SIP trunking providers looking for wholesale routes",
  sms_aggregators:
    "SMS hubs, A2P (Application-to-Person) messaging aggregators, bulk SMS platforms, OTP/2FA verification messaging providers, and SMS wholesale brokers",
  fintech:
    "FinTech companies, digital banking platforms, payment gateways, online lending services, and security-critical software firms seeking OTP or transactional SMS APIs",
  ecommerce:
    "growing e-commerce platforms, retail chains, shipping & logistics companies, and online marketplaces needing automated customer SMS notifications and dispatch APIs",
  call_centers:
    "contact centers, customer service outsource agencies, cloud call center platforms, CCaaS developers, and helpdesk providers requiring SIP trunks and outbound voice channels",
  mvnos:
    "MVNOs (Mobile Virtual Network Operators), regional ISPs, wireless service resellers, and local broadband/voice communication companies looking for transit partners",
  enterprise_saas:
    "SaaS platforms, CRM developers, HR systems, logistics dispatch software, and customer support suite developers looking to integrate global communications APIs (CPaaS)",
};

const FOCUS_PITCH_DESCRIPTIONS: Record<string, string> = {
  voip_carriers:
    "wholesale Voice/VoIP bilateral exchanges, competitive premium A-Z Voice termination, CLI-guaranteed routes, and direct tier-1 interconnects",
  sms_aggregators:
    "wholesale A2P/SMS termination hubs, high-capacity bulk SMS pipelines, carrier-grade route hubbing, stable OTP/2FA verification delivery, and bypass-prevention channels",
  fintech:
    "high-deliverability transactional messaging, secure OTP/2FA verification SMS APIs, sub-second latency messaging pipelines, and strict data confidentiality compliance",
  ecommerce:
    "automated customer order status and dispatch APIs, e-commerce shipping notifications, transactional messaging triggers, and multi-channel marketing reach",
  call_centers:
    "crystal-clear concurrent SIP trunking, cost-effective global outbound voice termination, high-quality audio compression (G.711/G.729), and international virtual numbers (DID)",
  mvnos:
    "regional ISP/MVNO transit partnerships, global roaming mobile voice & SMS transit hubs, and eSIM gateway interconnectivity",
  enterprise_saas:
    "Communications-Platform-as-a-Service (CPaaS) APIs for Voice/SMS integrations, flexible webhooks, robust CRM automated triggers, and custom developer tools",
};

export async function findMajorCities(location: string, focus: string): Promise<string[]> {
  const { ai, model } = await getAI();
  const prompt = `
    Analyze if the input "${location}" is a country or region.
    List the top 15 most active cities/hubs specifically for the "${focus}" industry in ${location}.
    If it is already a specific city, return just that city name in the array.

    Return ONLY a JSON array of strings: ["City1", "City2", ...]
  `;
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });
  const parsed = extractJson<unknown>(response.text || "[]", []);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((c): c is string => typeof c === "string");
}

export async function verifyEmail(
  email: string,
  companyName: string,
  website: string,
): Promise<{ isAuthentic: boolean; confidence: number; reason: string }> {
  const { ai, model } = await getAI();
  const prompt = `
    Verification Mission: Determine if the email "${email}" is a legitimate business contact for "${companyName}" (${website}).

    Steps:
    1. Search for this specific email on the official domain ${website}.
    2. Check professional directories (LinkedIn, ZoomInfo, Apollo, Yelp) for recent mentions of this contact at this company.
    3. Verify if the domain part of the email matches the website.

    Return ONLY a JSON object: {"isAuthentic": true/false, "confidence": 0-100, "reason": "..."}
  `;
  // NOTE: Gemini rejects combining `googleSearch` with `responseMimeType:
  // "application/json"`, so we rely on extractJson() to pull the JSON out of the
  // natural-language (tool-augmented) reply instead of forcing the JSON mime type.
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] },
  });
  const result = extractJson<{ isAuthentic?: boolean; confidence?: number; reason?: string }>(
    response.text || "{}",
    {},
  );
  const confidence = Number(result.confidence ?? 0);
  return {
    isAuthentic: result.isAuthentic === true && confidence >= 60,
    confidence,
    reason: result.reason ?? "",
  };
}

export interface RawLead {
  name: string;
  website: string;
  category: string;
  email: string;
  description: string;
}

export async function findLeads(city: string, country: string, focus: string): Promise<RawLead[]> {
  const { ai, model } = await getAI();
  const focusText = FOCUS_LEAD_PROMPTS[focus] || focus;
  const prompt = `
    Find a list of at least 10 unique and active ${focusText} located in or serving ${city}, ${country}.

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
    model,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], temperature: 0.1 },
  });
  const parsed = extractJson<RawLead[]>(response.text || "[]", []);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (l) => l && typeof l.name === "string" && typeof l.website === "string" && typeof l.email === "string",
  );
}

export interface GeneratedPitch {
  subject: string;
  htmlContent: string;
  textContent: string;
  detectedLanguage: string;
}

export async function generatePitch(
  lead: { name: string; category: string; website: string; description: string },
  focus: string,
  preferredLanguage: string,
): Promise<GeneratedPitch> {
  const { ai, model } = await getAI();
  const focusDesc = FOCUS_PITCH_DESCRIPTIONS[focus] || focus;
  const prompt = `
    You are the lead Carrier Relations and B2B Partnership Director for Unitel Global OÜ (a premium international telecommunications operator, wholesale voice carrier, and SMS transit hub based in Estonia, website: www.unitelglobal.com).

    Create a highly professional, bespoke, and visually stunning B2B sales pitch and partnership invitation for this target client:
    - Client Name: "${lead.name}"
    - Focus Industry/Segment: "${lead.category}"
    - Client Website: "${lead.website}"
    - Description: "${lead.description}"
    - Our Partnership Type: "${focusDesc}"

    Language Policy:
    - If preferred language is "Auto-Detect", analyze the client details (e.g. if Estonia/Baltics, use Estonian/English; if Germany/Austria, use German; if France, use French; if Spanish/LATAM, use Spanish, etc., defaulting to English if unclear or multi-regional).
    - Otherwise, write the email specifically in "${preferredLanguage}".
    - The pitch must feel natural, friendly, and highly professional. Never sound like spam. Respect their business model and align how Unitel Global can help them optimize rates, boost deliverability, or secure routes.

    We require a valid JSON object in response containing:
    1. "subject": An elegant, click-worthy email subject line.
    2. "htmlContent": A modern, responsive HTML email body with embedded CSS styles. Use high-contrast color schemes with a professional Unitel Global header, a personalized hook, bullet-point benefits, a clear call-to-action, and the signature "Unitel Global OÜ Team | Tallinn, Estonia | info@unitelglobal.com".
    3. "textContent": Plain-text version of the email.
    4. "detectedLanguage": The language name used to write the pitch.

    Format strictly as JSON:
    { "subject": "...", "htmlContent": "...", "textContent": "...", "detectedLanguage": "..." }
  `;
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: "application/json", temperature: 0.7 },
  });
  const result = extractJson<Partial<GeneratedPitch>>(response.text || "{}", {});
  return {
    subject: result.subject || `Wholesale Voice/SMS Interconnect Inquiry: Unitel Global <> ${lead.name}`,
    htmlContent: result.htmlContent || "",
    textContent: result.textContent || "",
    detectedLanguage: result.detectedLanguage || "English",
  };
}

/**
 * Test an AI configuration with a minimal request. Uses the provided key/model if given,
 * otherwise the currently saved settings. Returns a clear result for the UI.
 */
export async function verifyAiConfig(cfg?: {
  apiKey?: string;
  model?: string;
}): Promise<{ ok: boolean; message: string }> {
  try {
    let ai: GoogleGenAI;
    let model: string;
    if (cfg?.apiKey) {
      ai = new GoogleGenAI({ apiKey: cfg.apiKey });
      model = cfg.model || "gemini-2.5-flash";
    } else {
      const resolved = await getAI();
      ai = resolved.ai;
      model = resolved.model;
    }
    const response = await ai.models.generateContent({
      model,
      contents: 'Reply with the single word: OK',
    });
    const text = (response.text || "").trim();
    if (text) return { ok: true, message: `AI connection successful (model: ${model}).` };
    return { ok: false, message: "AI responded but returned no content." };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
