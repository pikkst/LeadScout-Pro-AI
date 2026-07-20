// AI service: encapsulates all Google Gemini interactions used by the platform.
import { GoogleGenAI } from "@google/genai";
import { HttpError } from "../utils/httpError";
import { getAiSettings, getCompanyProfile } from "./settings.service";

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
  // Universal / cross-industry segments
  manufacturing:
    "manufacturers, factories, production plants, and industrial equipment makers seeking suppliers, distributors, automation partners, or B2B channels",
  industrial:
    "heavy industry, machinery builders, chemical plants, and industrial service firms looking for partners, suppliers, or B2B customers",
  retail:
    "retail chains, consumer brands, supermarkets, and brick-and-mortar or online shops looking for suppliers, franchises, or B2B partnerships",
  technology:
    "technology hardware makers, electronics firms, and deep-tech companies seeking distribution, manufacturing, or partnership channels",
  it_services:
    "managed service providers (MSPs), IT consultancies, system integrators, and support firms looking for vendor or client partnerships",
  software:
    "software vendors, app developers, and platform companies seeking integration, reseller, or co-marketing partners",
  healthcare:
    "hospitals, clinics, pharma companies, medtech firms, and healthcare providers looking for suppliers, distributors, or B2B partners",
  finance:
    "banks, insurers, investment firms, and financial service providers seeking fintech, vendor, or institutional partnerships",
  real_estate:
    "real estate agencies, property developers, PropTech firms, and property managers looking for investors, tenants, or service partners",
  construction:
    "construction companies, contractors, builders, and building-material suppliers looking for projects, subcontractors, or B2B clients",
  energy:
    "energy producers, utilities, renewable energy firms, and grid operators seeking suppliers, off-takers, or infrastructure partners",
  logistics:
    "freight forwarders, warehousing firms, courier services, and supply-chain companies looking for carriers, shippers, or B2B clients",
  travel_hospitality:
    "hotels, resorts, travel agencies, airlines, restaurants, and leisure venues looking for distributors, OTAs, or B2B partners",
  media:
    "media agencies, publishers, broadcasters, game studios, and content platforms looking for advertisers, distributors, or production partners",
  education:
    "schools, universities, EdTech platforms, and training providers looking for partners, suppliers, or B2B clients",
  professional_services:
    "consultancies, law firms, accounting practices, and agencies looking for referral partners or B2B clients",
  telecom:
    "telecom operators, connectivity providers, and network equipment vendors looking for wholesale, roaming, or infrastructure partners",
  automotive:
    "car makers, mobility startups, dealerships, and auto suppliers looking for manufacturing, distribution, or technology partners",
  food_beverage:
    "food producers, beverage brands, restaurants, and distributors looking for suppliers, retailers, or B2B channels",
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
  // Universal / cross-industry segments
  manufacturing:
    "production capacity, supplier networks, distribution reach, and industrial automation or efficiency gains",
  industrial:
    "heavy-equipment supply, industrial services, operational efficiency, and B2B supply-chain reliability",
  retail:
    "retail distribution, shelf placement, brand reach, and consumer-demand growth channels",
  technology:
    "technology integration, hardware distribution, and co-development or OEM partnership opportunities",
  it_services:
    "managed services scale, vendor partnerships, and recurring B2B service revenue",
  software:
    "software integration, API partnerships, reseller channels, and co-marketing reach",
  healthcare:
    "compliance-ready supply, patient outcomes, and trusted healthcare partnership channels",
  finance:
    "secure financial infrastructure, regulatory readiness, and institutional trust",
  real_estate:
    "property pipeline, occupancy, and investment or development partnership value",
  construction:
    "project pipeline, build capacity, and reliable material or subcontractor supply",
  energy:
    "energy supply stability, sustainability goals, and infrastructure partnership value",
  logistics:
    "shipping capacity, transit reliability, and supply-chain efficiency gains",
  travel_hospitality:
    "occupancy, distribution via OTAs, and guest-experience or loyalty partnerships",
  media:
    "audience reach, advertising inventory, and content or distribution partnerships",
  education:
    "enrollment, learning outcomes, and EdTech or institutional partnerships",
  professional_services:
    "billable capacity, referral networks, and trusted advisory relationships",
  telecom:
    "connectivity reach, wholesale capacity, and network or roaming interconnects",
  automotive:
    "mobility scale, manufacturing capacity, and technology or distribution partnerships",
  food_beverage:
    "distribution reach, brand growth, and supply or retail partnership channels",
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
  estimatedValue: number;
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
     6. estimatedValue: your best estimate of the potential monthly contract value this company could
       represent for our business in EUR per month, based on company size and the relevant industry
       (startups ~500, mid-size ~2000-5000, large ~10000-50000). Output an integer only.

    Format strictly as a JSON array:
    [{"name": "...", "website": "...", "category": "...", "email": "...", "description": "...", "estimatedValue": 0}]
  `;
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], temperature: 0.1 },
  });
  const parsed = extractJson<RawLead[]>(response.text || "[]", []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((l) => l && typeof l.name === "string" && typeof l.website === "string" && typeof l.email === "string")
    .map((l) => ({ ...l, estimatedValue: Math.max(0, Math.floor(Number(l.estimatedValue) || 0)) }));
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
  template?: { subject: string; htmlContent: string; textContent: string } | null,
): Promise<GeneratedPitch> {
  const { ai, model } = await getAI();
  const focusDesc = FOCUS_PITCH_DESCRIPTIONS[focus] || focus;
  const company = await getCompanyProfile();

  const headerInstruction = company.logoUrl
    ? `Use this company logo image at the top of the email: <img src="${company.logoUrl}" alt="${company.name}" style="max-height:48px;margin-bottom:16px;" />. Only use this exact URL — do NOT invent or guess any other image/logo URLs.`
    : `Use a clean styled text header with the company name "${company.name}" — do NOT include any <img> image tags or external image URLs (they will appear broken).`;

  const signature = company.contactEmail
    ? `${company.name} Team | ${company.website ? company.website + " | " : ""}${company.contactEmail}`
    : `${company.name} Team`;

  const companyContext = [
    company.description && `Company overview: ${company.description}`,
    company.offerings && `We sell / offer: ${company.offerings}`,
    company.valueProp && `Our value proposition: ${company.valueProp}`,
    company.website && `Our website: ${company.website}`,
  ]
    .filter(Boolean)
    .join("\n");

  const templateInstruction = template
    ? `\nUse this saved email template as the structural base. Keep its tone, sections, and CTA style, but personalize it for the specific client:\nSubject: ${template.subject}\nHTML: ${template.htmlContent}\nText: ${template.textContent}\n`
    : "";

  const prompt = `
    You are the lead Partnership / Carrier Relations Director for ${company.name}.
    ${companyContext ? `\nContext about ${company.name} (use this to tailor the pitch):\n${companyContext}\n` : ""}
    ${templateInstruction}
    Create a highly professional, bespoke, and visually clean B2B sales pitch and partnership invitation for this target client:
    - Client Name: "${lead.name}"
    - Focus Industry/Segment: "${lead.category}"
    - Client Website: "${lead.website}"
    - Description: "${lead.description}"
    - Our Partnership Angle: "${focusDesc}"

    Language Policy:
    - If preferred language is "Auto-Detect", analyze the client details (e.g. if Estonia/Baltics, use Estonian/English; if Germany/Austria, use German; if France, use French; if Spanish/LATAM, use Spanish, etc., defaulting to English if unclear or multi-regional). The default company language is "${company.language}".
    - Otherwise, write the email specifically in "${preferredLanguage}".
    - The pitch must feel natural, friendly, and highly professional. Never sound like spam. Respect their business model and align how ${company.name} can help them.

    We require a valid JSON object in response containing:
    1. "subject": An elegant, click-worthy email subject line.
    2. "htmlContent": A modern, responsive HTML email body with embedded CSS styles. ${headerInstruction} Use a personalized hook, bullet-point benefits, a clear call-to-action, and the signature "${signature}".
    3. "textContent": Plain-text version of the email (ending with the same signature).
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
    subject: result.subject || `Partnership Inquiry: ${company.name} <> ${lead.name}`,
    htmlContent: result.htmlContent || "",
    textContent: result.textContent || "",
    detectedLanguage: result.detectedLanguage || company.language || "English",
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
