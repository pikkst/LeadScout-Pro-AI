import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON requests
  app.use(express.json());

  // Server-side lazy-initialization of Google GenAI SDK
  const getAI = () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required at runtime.");
    }
    return new GoogleGenAI({ apiKey: key });
  };

  const MODEL_NAME = 'gemini-3.5-flash';

  // --- API ENDPOINTS ---

  // 1. Identify Major Cities
  app.post("/api/cities", async (req, res) => {
    try {
      const { location, focus } = req.body;
      const ai = getAI();
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
      res.json(JSON.parse(text));
    } catch (err: any) {
      console.error("Error in /api/cities:", err);
      res.status(500).json({ error: err.message || "Failed to find major cities" });
    }
  });

  // 2. Email Verification with Search Grounding
  app.post("/api/verify", async (req, res) => {
    try {
      const { email, companyName, website } = req.body;
      const ai = getAI();
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
      const isAuthentic = result.isAuthentic === true && (result.confidence || 0) >= 60;
      res.json({ isAuthentic });
    } catch (err: any) {
      console.error("Error in /api/verify:", err);
      res.status(500).json({ error: err.message || "Failed to verify email" });
    }
  });

  // 3. Find Wholesalers & Leads with Search Grounding
  app.post("/api/leads", async (req, res) => {
    try {
      const { city, country, focus } = req.body;
      const ai = getAI();

      const focusPrompts: Record<string, string> = {
        voip_carriers: "telecom wholesale carriers, international voice operators, retail VoIP providers, Tier-2/Tier-3 carrier transit firms, and SIP trunking providers looking for wholesale routes",
        sms_aggregators: "SMS hubs, A2P (Application-to-Person) messaging aggregators, bulk SMS platforms, OTP/2FA verification messaging providers, and SMS wholesale brokers",
        fintech: "FinTech companies, digital banking platforms, payment gateways, online lending services, and security-critical software firms seeking OTP or transactional SMS APIs",
        ecommerce: "growing e-commerce platforms, retail chains, shipping & logistics companies, and online marketplaces needing automated customer SMS notifications and dispatch APIs",
        call_centers: "contact centers, customer service outsource agencies, cloud call center platforms, CCaaS developers, and helpdesk providers requiring SIP trunks and outbound voice channels",
        mvnos: "MVNOs (Mobile Virtual Network Operators), regional ISPs, wireless service resellers, and local broadband/voice communication companies looking for transit partners",
        enterprise_saas: "SaaS platforms, CRM developers, HR systems, logistics dispatch software, and customer support suite developers looking to integrate global communications APIs (CPaaS)"
      };

      const focusText = focusPrompts[focus] || focus;

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
        model: MODEL_NAME,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.1,
        },
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]).map((lead: any, index: number) => ({
          ...lead,
          id: `lead-${city}-${Date.now()}-${index}`
        }));
        res.json(parsed);
      } else {
        res.json([]);
      }
    } catch (err: any) {
      console.error("Error in /api/leads:", err);
      res.status(500).json({ error: err.message || "Failed to find leads" });
    }
  });

  // 4. Generate Personalized Sales Pitch / Partnership Invitation
  app.post("/api/pitch", async (req, res) => {
    try {
      const { lead, focus, preferredLanguage } = req.body;
      const ai = getAI();

      const focusDescriptions: Record<string, string> = {
        voip_carriers: "wholesale Voice/VoIP bilateral exchanges, competitive premium A-Z Voice termination, CLI-guaranteed routes, and direct tier-1 interconnects",
        sms_aggregators: "wholesale A2P/SMS termination hubs, high-capacity bulk SMS pipelines, carrier-grade route hubbing, stable OTP/2FA verification delivery, and bypass-prevention channels",
        fintech: "high-deliverability transactional messaging, secure OTP/2FA verification SMS APIs, sub-second latency messaging pipelines, and strict data confidentiality compliance",
        ecommerce: "automated customer order status and dispatch APIs, e-commerce shipping notifications, transactional messaging triggers, and multi-channel marketing reach",
        call_centers: "crystal-clear concurrent SIP trunking, cost-effective global outbound voice termination, high-quality audio compression (G.711/G.729), and international virtual numbers (DID)",
        mvnos: "regional ISP/MVNO transit partnerships, global roaming mobile voice & SMS transit hubs, and eSIM gateway interconnectivity",
        enterprise_saas: "Communications-Platform-as-a-Service (CPaaS) APIs for Voice/SMS integrations, flexible webhooks, robust CRM automated triggers, and custom developer tools"
      };

      const focusDesc = focusDescriptions[focus] || focus;

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
        1. "subject": An elegant, click-worthy email subject line (e.g., "Wholesale Voice/SMS Interconnect Inquiry: Unitel Global <> [Company Name]").
        2. "htmlContent": A modern, responsive HTML email body with embedded CSS styles. Use high-contrast color schemes (deep slate/navy backgrounds or white elegant card layout with sky-blue/blue accents and sharp readable text). Structure the email beautifully with:
           - A subtle header styled with "Unitel Global — Carrier Relations"
           - A highly personalized hook about what "${lead.name}" is doing in "${lead.category}"
           - Bullet points showing key partnership benefits (e.g., direct routes, wholesale margins, high throughput, 24/7 NOC support)
           - A clear, call-to-action (CTA) button or section (e.g. "Schedule Interconnect Call" or "Request Free Route Testing")
           - Professional email signature: "Unitel Global OÜ Team | Tallinn, Estonia | info@unitelglobal.com"
        3. "textContent": Plain-text version of the email.
        4. "detectedLanguage": The language name (e.g., "English", "Estonian", "German", "Spanish", etc.) used to write the pitch.
        
        Format strictly as JSON:
        {
          "subject": "...",
          "htmlContent": "...",
          "textContent": "...",
          "detectedLanguage": "..."
        }
      `;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      });

      const text = response.text || "{}";
      res.json(JSON.parse(text));
    } catch (err: any) {
      console.error("Error in /api/pitch:", err);
      res.status(500).json({ error: err.message || "Failed to generate pitch" });
    }
  });

  // --- VITE MIDDLEWARE INTERFACE ---
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Backend Server] Server bound to 0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
}

startServer();
