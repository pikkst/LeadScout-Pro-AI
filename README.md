<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# LeadScout Pro AI - SaaS Lead Generation Platform

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

A modern SaaS application that uses AI to find and verify business leads across Estonia and beyond. Built with React, TypeScript, Supabase, and Stripe.

## 🚀 Features

- **AI-Powered Lead Discovery**: Find targeted business contacts using advanced AI
- **Multiple Business Categories**: Events, Tech, Manufacturing, Healthcare, and more
- **User Authentication**: Secure signup/signin with Supabase Auth
- **Credit-Based Pricing**: Pay per download (€5 per CSV export)
- **Search History**: All searches saved to user dashboard
- **Stripe Integration**: Secure payment processing
- **Modern Landing Page**: Professional marketing site
- **GitHub Pages Ready**: Configured for easy deployment

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Payments**: Stripe
- **AI**: Google Gemini API
- **Styling**: Custom CSS with utility classes
- **Deployment**: GitHub Pages

## 📋 Prerequisites

- Node.js 18+
- Supabase account
- Stripe account
- Google AI Studio account (for Gemini API)
- GitHub account

## ⚡ Quick Start

### 1. Clone and Install
```bash
git clone https://github.com/pikkst/LeadScout-Pro-AI.git
cd LeadScout-Pro-AI
npm install
```

### 2. Environment Setup
Create `.env.local` file:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key_here
```

### 3. Supabase Setup
1. Create a new Supabase project
2. Run the SQL scripts from `SUPABASE_SETUP.md`
3. Enable Email authentication in Supabase Auth settings

### 4. Stripe Setup
1. Create a Stripe account
2. Get your publishable key
3. Configure webhooks (for production)

### 5. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see the app.

## 🌐 Deployment to GitHub Pages

### Automatic Deployment
```bash
npm run deploy
```

### Manual Setup
1. Enable GitHub Pages in repository settings
2. Set source to "GitHub Actions"
3. Push to main branch to trigger deployment

## 🏗 Project Structure

```
LeadScout-Pro-AI/
├── components/           # React components
│   ├── AgentTerminal.tsx    # Search progress display
│   ├── AuthModal.tsx        # Login/signup modal
│   ├── CreditPurchaseModal.tsx # Stripe payment modal
│   ├── LandingPage.tsx      # Marketing landing page
│   └── UserDashboard.tsx    # User search history
├── contexts/            # React contexts
│   └── AuthContext.tsx     # Authentication state
├── services/           # API services
│   ├── geminiService.ts    # AI lead generation
│   ├── queryHistoryService.ts # Database queries
│   ├── stripeService.ts    # Payment processing
│   └── supabaseClient.ts   # Database client
├── utils/              # Utility functions
│   └── csvExport.ts       # CSV file generation
├── App.tsx             # Main app router
├── LeadSearchApp.tsx   # Lead search interface
└── types.ts            # TypeScript definitions
```

## 💰 Business Model

- **€5 per download**: Users pay only when downloading CSV files
- **Credit system**: Purchase credits in bulk for better pricing
- **No monthly fees**: Pay-as-you-use model
- **Search history**: All searches saved, download anytime

## 🔧 Configuration

### Supabase Database
See `SUPABASE_SETUP.md` for complete schema and setup instructions.

### Stripe Integration
The app includes Stripe payment components but requires backend webhook handling for production use.

### Google Gemini AI
Used for intelligent lead discovery and email verification.

## 📊 Usage

1. **Sign up** for a new account
2. **Search** for leads by location and business type
3. **Review** results in the interface
4. **Purchase credits** via Stripe
5. **Download** CSV files of your leads
6. **Track** all searches in your dashboard

## 🔒 Security

- Row Level Security enabled in Supabase
- User authentication required for all operations
- Secure payment processing with Stripe
- API keys properly configured for client-side use

## 🚦 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_GEMINI_API_KEY` | Google Gemini API key | Yes |
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `VITE_STRIPE_PUBLIC_KEY` | Stripe publishable key | Yes |

## 📈 Analytics & Monitoring

- User signups and authentication
- Search queries and success rates
- Payment processing and credit usage
- Error tracking and performance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 🆘 Support

For support, please contact the development team or create an issue in the repository.

---

**LeadScout Pro AI** - Empowering businesses with AI-driven lead generation.
