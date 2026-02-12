import { supabase } from './supabaseClient';

// Generate unique session ID
const generateSessionId = (): string => {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// Known bot user agent patterns
const BOT_PATTERNS = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|mediapartners|google|baidu|yandex|duckduck|archive|semrush|ahref|mj12|dotbot|petalbot|bytespider|gptbot|anthropic|applebot|ia_archiver|wget|curl|python|headless/i;

// Check if current visitor is a bot
const isBot = (): boolean => {
  const ua = navigator.userAgent;
  if (BOT_PATTERNS.test(ua)) return true;
  // Headless browsers often lack plugins
  if (navigator.webdriver) return true;
  return false;
};

// Detect device type
const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
};

// Detect browser
const getBrowser = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Safari/')) return 'Safari';
  if (ua.includes('Opera/') || ua.includes('OPR/')) return 'Opera';
  return 'Other';
};

// Get clean page URL - strip tokens, hashes with auth data
const getCleanPageUrl = (): string => {
  const path = window.location.pathname;
  const hash = window.location.hash;
  
  // Strip any hash that contains access_token, error, or auth data
  if (hash && (hash.includes('access_token') || hash.includes('error=') || hash.includes('token_type='))) {
    return path;
  }
  
  return path + (hash && hash !== '#' ? hash : '');
};

// Parse UTM params from URL
const getUtmParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || null,
    utm_medium: params.get('utm_medium') || null,
    utm_campaign: params.get('utm_campaign') || null,
  };
};

// Tracking state
let sessionId: string | null = null;
let pageEnteredAt: number | null = null;
let currentPageUrl: string | null = null;
let isTracking = false;

// Save duration update for the current page
const saveDuration = async () => {
  if (!sessionId || !pageEnteredAt || !currentPageUrl) return;
  
  const durationSeconds = Math.round((Date.now() - pageEnteredAt) / 1000);
  if (durationSeconds < 1) return;

  try {
    // Update the last visit record for this session + page with duration
    await supabase
      .from('page_visits')
      .update({ duration_seconds: durationSeconds })
      .eq('session_id', sessionId)
      .eq('page_url', currentPageUrl);
  } catch (e) {
    // Silent fail — don't break the app for analytics
    console.debug('Tracking duration update failed:', e);
  }
};

// Track a page visit
export const trackPageVisit = async (userId?: string) => {
  try {
    // Skip bots entirely
    if (isBot()) {
      console.debug('Bot detected, skipping tracking');
      return;
    }

    if (!sessionId) {
      sessionId = sessionStorage.getItem('ls_session_id') || generateSessionId();
      sessionStorage.setItem('ls_session_id', sessionId);
    }

    // Save duration of previous page first
    await saveDuration();

    const pageUrl = getCleanPageUrl();
    currentPageUrl = pageUrl;
    pageEnteredAt = Date.now();

    const utm = getUtmParams();

    await supabase.from('page_visits').insert({
      user_id: userId || null,
      session_id: sessionId,
      page_url: pageUrl,
      referrer: document.referrer || null,
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      device_type: getDeviceType(),
      browser: getBrowser(),
      duration_seconds: 0,
    });
  } catch (e) {
    console.debug('Page visit tracking failed:', e);
  }
};

// Initialize tracking — call once on app mount
export const initTracking = (userId?: string) => {
  if (isTracking) return;
  isTracking = true;

  // Track initial page
  trackPageVisit(userId);

  // Update duration on page unload
  const handleUnload = () => {
    saveDuration();
  };

  window.addEventListener('beforeunload', handleUnload);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveDuration();
    }
  });

  // Track hash changes (SPA navigation)
  window.addEventListener('hashchange', () => {
    trackPageVisit(userId);
  });
};

// Update user ID after login
export const updateTrackingUserId = (userId: string) => {
  // Re-track with user ID attached
  trackPageVisit(userId);
};
