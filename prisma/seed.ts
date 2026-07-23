// Seed script: creates the initial Unitel Global admin user and demo data.
// Run with: npm run db:seed
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@unitelglobal.com").toLowerCase();
  const name = process.env.SEED_ADMIN_NAME || "Unitel Global Admin";
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";

  const existing = await prisma.user.findUnique({ where: { email } });
  let adminId: string;
  if (existing) {
    console.log(`[seed] Admin user already exists: ${email} — skipping.`);
    adminId = existing.id;
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, name, passwordHash, role: "ADMIN" },
    });
    adminId = user.id;
    console.log("[seed] Created admin user:");
    console.log(`  email:    ${user.email}`);
    console.log("[seed] IMPORTANT: change this password after first login.");
  }

  if (!(await prisma.lead.findFirst())) {
    console.log("[seed] Seeding demo data...");
    const lead1 = await prisma.lead.create({
      data: {
        name: "Deutsche Telekom Carrier Services",
        website: "https://carrier.telekom.de",
        domain: "carrier.telekom.de",
        email: "wholesale-noc@telekom.de",
        category: "voip_carriers",
        description: "Major German carrier looking for European termination routes.",
        stage: "NEGOTIATION",
        phone: "+49 228 1810",
        estimatedValue: 5000,
        assignedAgentId: adminId,
        notes: "Sent pricing on July 19th. Awaiting SLA signoff.",
        source: "MANUAL",
        createdById: adminId,
        enrichmentData: JSON.stringify({
          companySize: "10,001+ employees",
          employeeCount: 210000,
          techStack: ["SIP", "SS7", "SBC"],
          recentNews: ["Expanded 5G network coverage", "New data center in Frankfurt"],
          decisionMakers: [{ name: "Thomas Müller", title: "VP Wholesale" }],
        }),
      },
    });

    const lead2 = await prisma.lead.create({
      data: {
        name: "Telia Finland",
        website: "https://telia.fi",
        domain: "telia.fi",
        email: "carrier@telia.fi",
        category: "voip_carriers",
        description: "Nordic carrier interested in Baltic routes.",
        stage: "CONTACTED",
        phone: "+358 10 24 1000",
        estimatedValue: 3000,
        assignedAgentId: adminId,
        source: "MANUAL",
        createdById: adminId,
      },
    });

    await prisma.pitch.createMany({
      data: [
        {
          leadId: lead1.id,
          leadName: lead1.name,
          leadEmail: lead1.email,
          subject: "European Route Partnership Proposal",
          htmlContent: "<p>Dear Deutsche Telekom Team,</p><p>We would like to propose a partnership...</p>",
          textContent: "Dear Deutsche Telekom Team,\n\nWe would like to propose a partnership...",
          language: "English",
          status: "SENT",
          createdById: adminId,
          sentMessageId: "<demo1@unitelglobal.com>",
        },
        {
          leadId: lead2.id,
          leadName: lead2.name,
          leadEmail: lead2.email,
          subject: "Baltic Termination Rates",
          htmlContent: "<p>Hello,</p><p>Please find our Baltic rates attached...</p>",
          textContent: "Hello,\n\nPlease find our Baltic rates attached...",
          language: "English",
          status: "DRAFT",
          createdById: adminId,
        },
      ],
    });

    const account = await prisma.account.create({
      data: {
        name: lead1.name,
        domain: "telekom.de",
        website: lead1.website,
        industry: "Telecommunications",
        description: lead1.description,
        ownerId: adminId,
      },
    });

    await prisma.contact.create({
      data: {
        fullName: "Thomas Müller",
        email: "thomas.mueller@telekom.de",
        phone: "+49 228 1810",
        title: "VP Wholesale",
        accountId: account.id,
        ownerId: adminId,
        consentStatus: "CONFIRMED",
      },
    });

    await prisma.opportunity.create({
      data: {
        name: "Telekom European Routes",
        stage: "Prospecting",
        status: "OPEN",
        value: 5000,
        currency: "EUR",
        probability: 20,
        accountId: account.id,
        ownerId: adminId,
      },
    });

    const connection = await prisma.integrationConnection.create({
      data: {
        userId: adminId,
        provider: "GOOGLE",
        accountEmail: "demo@unitelglobal.com",
        accessToken: "demo-access-token",
        refreshToken: "demo-refresh-token",
        scopes: [],
        status: "ACTIVE",
      },
    });

    await prisma.conversation.create({
      data: {
        externalThreadId: "demo-thread-1",
        subject: "Re: European Route Partnership Proposal",
        participants: { from: lead1.email, to: "info@unitelglobal.com" },
        status: "OPEN",
        unreadCount: 1,
        lastMessageAt: new Date(),
        connectionId: connection.id,
        ownerId: adminId,
        legacyLeadId: lead1.id,
        messages: {
          create: {
            externalMessageId: "demo-msg-1",
            direction: "INBOUND",
            senderEmail: lead1.email,
            recipientEmails: ["info@unitelglobal.com"],
            subject: "Re: European Route Partnership Proposal",
            textBody: "Thank you for your proposal. We are interested in learning more about your Baltic routes.",
            occurredAt: new Date(),
            isRead: false,
          },
        },
      },
    });

    console.log("[seed] Demo data created.");
  } else {
    console.log("[seed] Database already has data — skipping demo seed.");
  }
}

main()
  .catch((e) => {
    console.error("[seed] Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
