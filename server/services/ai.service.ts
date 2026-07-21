// AI service: encapsulates all Google Gemini interactions used by the platform.
import { GoogleGenAI } from "@google/genai";
import { HttpError } from "../utils/httpError";
import { prisma } from "../db";
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
export function extractJson<T>(text: string, fallback: T): T {
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

export interface LeadScoreResult {
  score: number;
  reason: string;
}

export async function calculateLeadScore(lead: {
  name: string;
  category: string;
  website: string;
  description: string;
  estimatedValue: number;
  isVerified: boolean;
  stage: string;
}): Promise<LeadScoreResult> {
  const { ai, model } = await getAI();
  const prompt = `
    You are a B2B sales AI. Analyze this lead and predict their conversion probability (0-100).

    Lead details:
    - Name: "${lead.name}"
    - Industry: "${lead.category}"
    - Website: "${lead.website}"
    - Description: "${lead.description}"
    - Estimated monthly value: EUR ${lead.estimatedValue}
    - Verification status: ${lead.isVerified ? 'verified' : 'unverified'}
    - Pipeline stage: "${lead.stage}"

    Return ONLY a JSON object:
    {
      "score": 0-100,
      "reason": "1-2 sentence explanation of why this score was given"
    }
  `;
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: "application/json", temperature: 0.2 },
  });
  const result = extractJson<{ score?: number; reason?: string }>(response.text || "{}", {});
  const score = Math.max(0, Math.min(100, Math.round(Number(result.score ?? 50))));
  return {
    score,
    reason: result.reason || "AI analysis completed",
  };
}

export interface EnrichmentResult {
  companySize: string;
  employeeCount?: number;
  techStack: string[];
  recentNews: string[];
  decisionMakers: Array<{ name: string; title: string }>;
}

export async function enrichLead(lead: {
  name: string;
  category: string;
  website: string;
  description: string;
}): Promise<EnrichmentResult> {
  const { ai, model } = await getAI();
  const prompt = `
    Research and enrich this company profile using your knowledge and search capabilities.

    Company:
    - Name: "${lead.name}"
    - Industry: "${lead.category}"
    - Website: "${lead.website}"
    - Description: "${lead.description}"

    Return ONLY a JSON object:
    {
      "companySize": "startup|small|medium|large|enterprise",
      "employeeCount": estimated integer or null,
      "techStack": ["tech1", "tech2", ...],
      "recentNews": ["brief news item 1", "brief news item 2"],
      "decisionMakers": [{"name": "Full Name", "title": "Job Title"}, ...]
    }
  `;
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], temperature: 0.3 },
  });
  const result = extractJson<Partial<EnrichmentResult>>(response.text || "{}", {});
  return {
    companySize: result.companySize || "unknown",
    employeeCount: result.employeeCount,
    techStack: Array.isArray(result.techStack) ? result.techStack : [],
    recentNews: Array.isArray(result.recentNews) ? result.recentNews : [],
    decisionMakers: Array.isArray(result.decisionMakers) ? result.decisionMakers : [],
  };
}

export interface StagePrediction {
  predictedStage: string;
  probability: number;
  estimatedDays: number;
  reasoning: string;
}

export async function predictStageTransition(lead: {
  name: string;
  category: string;
  stage: string;
  estimatedValue: number;
  isVerified: boolean;
  lastContactedAt?: string;
  followUpTask?: { isCompleted: boolean };
  pitches?: Array<{ status: string }>;
}): Promise<StagePrediction> {
  const { ai, model } = await getAI();
  const prompt = `
    You are a B2B sales AI. Predict the next pipeline stage transition for this lead.

    Lead details:
    - Name: "${lead.name}"
    - Industry: "${lead.category}"
    - Current stage: "${lead.stage}"
    - Estimated monthly value: EUR ${lead.estimatedValue}
    - Verification status: ${lead.isVerified ? 'verified' : 'unverified'}
    - Last contacted: ${lead.lastContactedAt || 'never'}
    - Has active follow-up task: ${lead.followUpTask?.isCompleted ? 'completed' : 'pending or none'}
    - Pitch count: ${lead.pitches?.length || 0}

    Possible next stages: Contacted, Negotiation, Signed, Active, Archived

    Return ONLY a JSON object:
    {
      "predictedStage": "next stage name",
      "probability": 0-100,
      "estimatedDays": integer estimate of days until transition,
      "reasoning": "1-2 sentence explanation"
    }
  `;
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: "application/json", temperature: 0.2 },
  });
  const result = extractJson<Partial<StagePrediction>>(response.text || "{}", {});
  return {
    predictedStage: result.predictedStage || "Contacted",
    probability: Math.max(0, Math.min(100, Math.round(Number(result.probability ?? 50)))),
    estimatedDays: Math.max(1, Math.round(Number(result.estimatedDays ?? 7))),
    reasoning: result.reasoning || "AI analysis completed",
  };
}

export interface AiForecast {
  next30Days: { estimatedDeals: number; estimatedValue: number };
  next90Days: { estimatedDeals: number; estimatedValue: number };
  confidence: number;
  assumptions: string[];
}

export async function generateAiForecast(leads: Array<{
  stage: string;
  estimatedValue: number;
  aiScore?: number;
}>, recentDeals: Array<{ value: number; closedAt: string }>): Promise<AiForecast> {
  const { ai, model } = await getAI();
  const stageDistribution = leads.reduce((acc, lead) => {
    acc[lead.stage] = (acc[lead.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const avgScore = leads.filter(l => l.aiScore !== undefined).length > 0
    ? Math.round(leads.filter(l => l.aiScore !== undefined).reduce((sum, l) => sum + (l.aiScore || 0), 0) / leads.filter(l => l.aiScore !== undefined).length)
    : null;

  const prompt = `
    You are a B2B sales forecasting AI. Generate a revenue forecast based on pipeline data.

    Pipeline summary:
    - Total leads: ${leads.length}
    - Stage distribution: ${JSON.stringify(stageDistribution)}
    - Average AI score: ${avgScore ?? 'not available'}
    - Recent closed deals (last 90 days): ${recentDeals.length} deals totaling EUR ${recentDeals.reduce((sum, d) => sum + d.value, 0)}

    Historical conversion context:
    - Discovered -> Contacted: ~30%
    - Contacted -> Negotiation: ~25%
    - Negotiation -> Signed: ~50%
    - Signed -> Active: ~90%

    Return ONLY a JSON object:
    {
      "next30Days": { "estimatedDeals": integer, "estimatedValue": integer },
      "next90Days": { "estimatedDeals": integer, "estimatedValue": integer },
      "confidence": 0-100,
      "assumptions": ["assumption 1", "assumption 2", ...]
    }
  `;
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: "application/json", temperature: 0.3 },
  });
  const result = extractJson<Partial<AiForecast>>(response.text || "{}", {});
  return {
    next30Days: {
      estimatedDeals: Math.round(Number(result.next30Days?.estimatedDeals ?? 0)),
      estimatedValue: Math.round(Number(result.next30Days?.estimatedValue ?? 0)),
    },
    next90Days: {
      estimatedDeals: Math.round(Number(result.next90Days?.estimatedDeals ?? 0)),
      estimatedValue: Math.round(Number(result.next90Days?.estimatedValue ?? 0)),
    },
    confidence: Math.max(0, Math.min(100, Math.round(Number(result.confidence ?? 60)))),
    assumptions: Array.isArray(result.assumptions) ? result.assumptions : [],
  };
}

export interface MeetingPrep {
  talkingPoints: string[];
  winThemes: string[];
  potentialObjections: string[];
  recommendedApproach: string;
}

export async function generateMeetingPrep(meeting: {
  title: string;
  type: string;
  agenda: string;
  lead: {
    name: string;
    category: string;
    website: string;
    description: string;
    stage: string;
    estimatedValue: number;
    enrichmentData?: {
      companySize?: string;
      techStack?: string[];
      recentNews?: string[];
      decisionMakers?: Array<{ name: string; title: string }>;
    };
  };
}): Promise<MeetingPrep> {
  const { ai, model } = await getAI();
  const prompt = `
    You are a B2B sales director preparing for an important meeting. Generate meeting preparation insights.

    Meeting:
    - Title: "${meeting.title}"
    - Type: "${meeting.type}"
    - Agenda: "${meeting.agenda || 'No agenda provided'}"

    Lead/Company:
    - Name: "${meeting.lead.name}"
    - Industry: "${meeting.lead.category}"
    - Website: "${meeting.lead.website}"
    - Description: "${meeting.lead.description}"
    - Pipeline stage: "${meeting.lead.stage}"
    - Estimated value: EUR ${meeting.lead.estimatedValue}
    - Company size: ${meeting.lead.enrichmentData?.companySize || 'unknown'}
    - Tech stack: ${meeting.lead.enrichmentData?.techStack?.join(', ') || 'unknown'}
    - Recent news: ${meeting.lead.enrichmentData?.recentNews?.join('; ') || 'none'}
    - Decision makers: ${meeting.lead.enrichmentData?.decisionMakers?.map(dm => `${dm.name} (${dm.title})`).join('; ') || 'unknown'}

    Return ONLY a JSON object:
    {
      "talkingPoints": ["point 1", "point 2", "point 3"],
      "winThemes": ["theme 1", "theme 2"],
      "potentialObjections": ["objection 1", "objection 2"],
      "recommendedApproach": "1-2 sentence strategic recommendation"
    }
  `;
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: "application/json", temperature: 0.4 },
  });
  const result = extractJson<Partial<MeetingPrep>>(response.text || "{}", {});
  return {
    talkingPoints: Array.isArray(result.talkingPoints) ? result.talkingPoints : ["Review lead background", "Discuss partnership opportunities"],
    winThemes: Array.isArray(result.winThemes) ? result.winThemes : ["Value proposition alignment", "Mutual growth potential"],
    potentialObjections: Array.isArray(result.potentialObjections) ? result.potentialObjections : ["Budget constraints", "Timing concerns"],
    recommendedApproach: result.recommendedApproach || "Focus on mutual benefits and clear ROI.",
  };
}

export interface SendTimeRecommendation {
  recommendedHour: number;
  recommendedDay: string;
  confidence: number;
  reason: string;
}

export async function recommendSendTime(leadId: string, agentId?: string): Promise<SendTimeRecommendation> {
  const { ai, model } = await getAI();
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      pitches: {
        where: { status: { in: ["SENT", "DELIVERED", "REPLIED"] } },
        include: { events: true },
      },
    },
  });
  if (!lead) throw new Error("Lead not found");

  const pitchEvents = (lead.pitches as Array<{ events: Array<{ type: string; createdAt: Date }> }>).flatMap(p => p.events);
  const openedEvents = pitchEvents.filter(e => e.type === "OPENED");
  const clickedEvents = pitchEvents.filter(e => e.type === "CLICKED");

  const hourCounts: Record<number, number> = {};
  openedEvents.forEach(e => {
    const hour = new Date(e.createdAt).getUTCHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const dayCounts: Record<string, number> = {};
  openedEvents.forEach(e => {
    const day = new Date(e.createdAt).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });

  const bestHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
  const bestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];

  const prompt = `
    You are an email marketing AI. Recommend the best send time for a B2B outreach email.

    Lead: ${lead.name}
    Industry: ${lead.category}
    Country/Region: unknown

    Historical engagement data:
    - Total opened emails: ${openedEvents.length}
    - Total clicked emails: ${clickedEvents.length}
    - Best hour by opens: ${bestHour ? `${bestHour[0]}:00 UTC (${bestHour[1]} opens)` : 'no data'}
    - Best day by opens: ${bestDay ? bestDay[0] : 'no data'}

    Return ONLY a JSON object:
    {
      "recommendedHour": 0-23,
      "recommendedDay": "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday",
      "confidence": 0-100,
      "reason": "1 sentence explanation"
    }
  `;
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: "application/json", temperature: 0.2 },
  });
  const result = extractJson<Partial<SendTimeRecommendation>>(response.text || "{}", {});
  return {
    recommendedHour: Math.max(0, Math.min(23, Math.round(Number(result.recommendedHour ?? 9)))),
    recommendedDay: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].includes(result.recommendedDay || "") ? result.recommendedDay! : "Tuesday",
    confidence: Math.max(0, Math.min(100, Math.round(Number(result.confidence ?? 50)))),
    reason: result.reason || "Based on general B2B best practices.",
  };
}

export interface MonitoringAlert {
  id: string;
  type: string;
  title: string;
  description: string;
  source?: string;
  isRead: boolean;
  createdAt: string;
}

export interface CompetitorInsight {
  competitor: string;
  recentMoves: string[];
  threatLevel: "LOW" | "MEDIUM" | "HIGH";
  recommendation: string;
}

export async function generateCompetitorInsights(lead: {
  name: string;
  category: string;
  website: string;
  description: string;
  enrichmentData?: {
    techStack?: string[];
    recentNews?: string[];
  };
}): Promise<CompetitorInsight[]> {
  const { ai, model } = await getAI();
  const prompt = `
    You are a B2B competitive intelligence analyst. Identify 2-3 likely competitors for this company and assess competitive threats.

    Company:
    - Name: "${lead.name}"
    - Industry: "${lead.category}"
    - Website: "${lead.website}"
    - Description: "${lead.description}"
    - Tech stack: ${lead.enrichmentData?.techStack?.join(", ") || "unknown"}
    - Recent news: ${lead.enrichmentData?.recentNews?.join("; ") || "none"}

    Return ONLY a JSON array:
    [
      {
        "competitor": "Competitor Name",
        "recentMoves": ["move 1", "move 2"],
        "threatLevel": "LOW" | "MEDIUM" | "HIGH",
        "recommendation": "1 sentence action"
      }
    ]
  `;
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], temperature: 0.3 },
  });
  const result = extractJson<Partial<CompetitorInsight>[]>(response.text || "[]", []);
  return result.map(r => ({
    competitor: r.competitor || "Unknown",
    recentMoves: Array.isArray(r.recentMoves) ? r.recentMoves : [],
    threatLevel: ["LOW", "MEDIUM", "HIGH"].includes(r.threatLevel || "") ? r.threatLevel! : "LOW",
    recommendation: r.recommendation || "Monitor this competitor.",
  }));
}

export interface AgentCoachingInsight {
  insightType: string;
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
}

export async function generateAgentCoaching(agentId: string, agentName: string, stats: {
  totalLeads: number;
  byStage: Record<string, number>;
  deals: number;
  totalDealValue: number;
  totalCommission: number;
  avgDealSize: number;
  conversionRate: number;
  recentActivities: Array<{ action: string; detail: string; createdAt: string }>;
}): Promise<AgentCoachingInsight[]> {
  const { ai, model } = await getAI();
  const prompt = `
    You are a B2B sales coach. Analyze this agent's performance and generate actionable coaching insights.

    Agent: ${agentName}
    - Total leads: ${stats.totalLeads}
    - Pipeline stages: ${JSON.stringify(stats.byStage)}
    - Deals closed: ${stats.deals}
    - Total deal value: EUR ${stats.totalDealValue}
    - Total commission: EUR ${stats.totalCommission}
    - Avg deal size: EUR ${stats.avgDealSize}
    - Conversion rate: ${stats.conversionRate}%
    - Recent activities: ${stats.recentActivities.slice(0, 5).map(a => `${a.action}: ${a.detail}`).join("; ")}

    Return ONLY a JSON array of 2-3 insights:
    [
      {
        "insightType": "STAGE_TRANSITION" | "RESPONSE_RATE" | "PITCH_QUALITY" | "FOLLOW_UP" | "GENERAL",
        "title": "Short title",
        "description": "Detailed coaching advice",
        "priority": "LOW" | "MEDIUM" | "HIGH"
      }
    ]
  `;
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: "application/json", temperature: 0.4 },
  });
  const result = extractJson<Partial<AgentCoachingInsight>[]>(response.text || "[]", []);
  return result.map(r => ({
    insightType: r.insightType || "GENERAL",
    title: r.title || "Performance insight",
    description: r.description || "Keep up the good work.",
    priority: ["LOW", "MEDIUM", "HIGH"].includes(r.priority || "") ? r.priority! : "MEDIUM",
  }));
}
