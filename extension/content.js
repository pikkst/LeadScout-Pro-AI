// Content script for LinkedIn and Google Maps
// Injects a "Add to LeadScout" button on company pages

(function() {
  'use strict';

  // Only run on company pages
  if (!window.location.pathname.includes('/company/') && 
      !window.location.pathname.includes('/maps/search/') &&
      !window.location.pathname.includes('/maps/place/')) {
    return;
  }

  // Create floating button
  const button = document.createElement('div');
  button.id = 'leadscout-quick-add';
  button.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
    <span>Add to LeadScout</span>
  `;

  button.addEventListener('click', () => {
    const leadData = extractLeadFromPage();
    
    // Open popup with data
    chrome.runtime.sendMessage({
      action: 'openQuickAdd',
      data: leadData
    });
  });

  document.body.appendChild(button);

  // Extract lead data from page
  function extractLeadFromPage() {
    const result: any = {};

    if (window.location.hostname === 'www.linkedin.com' || window.location.hostname.endsWith('.linkedin.com')) {
      // LinkedIn company page
      const companyName = document.querySelector('.org-top-card-summary__title')?.textContent?.trim();
      const companyWebsite = document.querySelector('.org-top-card-summary__website')?.textContent?.trim();
      const companyDesc = document.querySelector('.org-top-card-summary__description')?.textContent?.trim();
      const industry = document.querySelector('.org-top-card-summary__industry')?.textContent?.trim();

      result.name = companyName || '';
      result.website = companyWebsite || '';
      result.description = companyDesc || '';
      result.category = mapIndustryToCategory(industry);
    } else if (window.location.hostname === 'www.google.com' || window.location.hostname === 'maps.google.com') {
      // Google Maps
      const placeName = document.querySelector('[role="heading"]')?.textContent?.trim() || 
                        document.querySelector('h1')?.textContent?.trim() || '';
      const address = document.querySelector('[data-item-id="address"]')?.textContent?.trim() || '';
      
      result.name = placeName || '';
      result.description = address || '';
    }

    return result;
  }

  function mapIndustryToCategory(industry: string): string {
    const lower = industry.toLowerCase();
    if (lower.includes('telecom') || lower.includes('voip') || lower.includes('voice')) return 'voip_carriers';
    if (lower.includes('sms') || lower.includes('messaging')) return 'sms_aggregators';
    if (lower.includes('fintech') || lower.includes('financial')) return 'fintech';
    if (lower.includes('ecommerce') || lower.includes('retail')) return 'ecommerce';
    if (lower.includes('call center') || lower.includes('contact center')) return 'call_centers';
    if (lower.includes('mvno') || lower.includes('mobile')) return 'mvnos';
    if (lower.includes('saas') || lower.includes('software')) return 'enterprise_saas';
    if (lower.includes('manufacturing')) return 'manufacturing';
    if (lower.includes('healthcare') || lower.includes('medical')) return 'healthcare';
    if (lower.includes('logistics') || lower.includes('shipping')) return 'logistics';
    return 'other';
  }
})();
