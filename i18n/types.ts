export type Language = 'en' | 'ru' | 'fi' | 'de' | 'es';

export interface LanguageInfo {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
];

export interface Translations {
  // SEO
  seo: {
    title: string;
    description: string;
    privacyTitle: string;
    privacyDescription: string;
    termsTitle: string;
    termsDescription: string;
  };
  // Header
  header: {
    subtitle: string;
    features: string;
    pricing: string;
    howItWorks: string;
    signIn: string;
    signUp: string;
  };
  // Hero
  hero: {
    badge: string;
    titleLine1: string;
    titleLine2: string;
    description: string;
    ctaButton: string;
    ctaSecondary: string;
    stat1Value: string;
    stat1Label: string;
    stat2Value: string;
    stat2Label: string;
    stat3Value: string;
    stat3Label: string;
  };
  // Features
  features: {
    title: string;
    subtitle: string;
    feature1Title: string;
    feature1Desc: string;
    feature2Title: string;
    feature2Desc: string;
    feature3Title: string;
    feature3Desc: string;
  };
  // How it works
  howItWorks: {
    title: string;
    subtitle: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
  };
  // Pricing
  pricing: {
    title: string;
    subtitle: string;
    perDownload: string;
    price: string;
    priceDesc: string;
    feature1: string;
    feature2: string;
    feature3: string;
    feature4: string;
    feature5: string;
    getStarted: string;
  };
  // CTA
  cta: {
    title: string;
    description: string;
    button: string;
  };
  // Footer
  footer: {
    allRights: string;
    companyInfo: string;
    responseTime: string;
    privacyPolicy: string;
    termsOfService: string;
  };
  // Auth Modal
  auth: {
    signIn: string;
    signUp: string;
    resetPassword: string;
    checkEmail: string;
    email: string;
    password: string;
    fullName: string;
    loading: string;
    emailSent: string;
    emailSentDesc: string;
    checkSpam: string;
    backToSignIn: string;
    forgotDesc: string;
    sending: string;
    sendResetLink: string;
    registrationSuccess: string;
    confirmationSent: string;
    confirmationSpam: string;
    gotIt: string;
    noAccount: string;
    hasAccount: string;
    forgotPassword: string;
  };
  // Privacy Policy
  privacy: {
    title: string;
    lastUpdated: string;
    backToHome: string;
    section1Title: string;
    section1Text: string;
    section1Contact: string;
    section2Title: string;
    section2Items: string[];
    section3Title: string;
    section3Items: string[];
    section4Title: string;
    section4Intro: string;
    section4Items: string[];
    section4NoSell: string;
    section5Title: string;
    section5Intro: string;
    section5Items: string[];
    section5Exercise: string;
    section6Title: string;
    section6Text: string;
    section7Title: string;
    section7Text: string;
    section8Title: string;
    section8Text: string;
    section9Title: string;
    section9Text: string;
    section10Title: string;
    section10Text: string;
  };
  // Terms of Service
  terms: {
    title: string;
    lastUpdated: string;
    backToHome: string;
    section1Title: string;
    section1Text: string;
    section1Contact: string;
    section2Title: string;
    section2Text: string;
    section3Title: string;
    section3Items: string[];
    section4Title: string;
    section4Items: string[];
    section5Title: string;
    section5Text: string;
    section5Refund: string;
    section6Title: string;
    section6Text: string;
    section7Title: string;
    section7Intro: string;
    section7Items: string[];
    section8Title: string;
    section8Text: string;
    section9Title: string;
    section9Text: string;
    section10Title: string;
    section10Text: string;
    section11Title: string;
    section11Text: string;
    section12Title: string;
    section12Text: string;
  };
}
