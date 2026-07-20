document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('leadForm');
  const saveBtn = document.getElementById('saveBtn');
  const autoFillBtn = document.getElementById('autoFillBtn');
  const status = document.getElementById('status');

  // Load saved API URL
  chrome.storage.local.get(['apiUrl'], (result) => {
    if (result.apiUrl) {
      document.getElementById('apiUrl')?.remove();
    }
  });

  // Auto-fill from current page
  autoFillBtn.addEventListener('click', async () => {
    status.textContent = 'Scanning page...';
    status.className = 'status loading';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id! },
        func: extractLeadFromPage,
      });

      const data = results[0]?.result;
      if (data) {
        if (data.name) document.getElementById('name')!.value = data.name;
        if (data.website) document.getElementById('website')!.value = data.website;
        if (data.email) document.getElementById('email')!.value = data.email;
        if (data.description) document.getElementById('description')!.value = data.description;
        status.textContent = `Found: ${data.name || 'company'}`;
        status.className = 'status success';
      } else {
        status.textContent = 'No company info found on this page';
        status.className = 'status error';
      }
    } catch (err) {
      status.textContent = 'Error scanning page';
      status.className = 'status error';
    }
  });

  // Save lead
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    status.textContent = '';
    status.className = 'status';

    const formData = new FormData(form);
    const lead = {
      name: formData.get('name')?.toString().trim(),
      website: formData.get('website')?.toString().trim(),
      email: formData.get('email')?.toString().trim(),
      category: formData.get('category')?.toString(),
      description: formData.get('description')?.toString().trim(),
      source: 'MANUAL',
      stage: 'Discovered',
    };

    if (!lead.name) {
      status.textContent = 'Company name is required';
      status.className = 'status error';
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Lead';
      return;
    }

    try {
      const result = await chrome.storage.local.get(['apiUrl', 'authToken']);
      const apiUrl = result.apiUrl || 'http://localhost:3000';
      const authToken = result.authToken;

      const response = await fetch(`${apiUrl}/api/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(lead),
      });

      if (response.ok) {
        status.textContent = 'Lead saved successfully!';
        status.className = 'status success';
        form.reset();
      } else if (response.status === 401) {
        status.textContent = 'Please login in the main app';
        status.className = 'status error';
      } else {
        const err = await response.json();
        status.textContent = err.message || 'Failed to save';
        status.className = 'status error';
      }
    } catch (err) {
      status.textContent = 'Connection error';
      status.className = 'status error';
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Lead';
    }
  });
});

// Extract lead info from current page
function extractLeadFromPage() {
  const result: any = {};

  // Try to get company name from various sources
  const title = document.querySelector('h1')?.textContent?.trim();
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim();
  const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute('content')?.trim();

  result.name = title || ogTitle || twitterTitle || document.title?.split('|')[0]?.trim() || '';

  // Try to get website
  const ogUrl = document.querySelector('meta[property="og:url"]')?.getAttribute('content')?.trim();
  const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href')?.trim();
  result.website = ogUrl || canonical || window.location.hostname;

  // Try to get email
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = document.body.innerHTML.match(emailRegex) || [];
  const validEmails = emails.filter(e => !e.includes('example') && !e.includes('sentry') && !e.includes('github'));
  if (validEmails.length > 0) {
    result.email = validEmails[0];
  }

  // Try to get description
  const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim();
  const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();
  result.description = ogDesc || metaDesc || '';

  // LinkedIn specific
  if (window.location.hostname.includes('linkedin.com')) {
    const companyName = document.querySelector('.org-top-card-summary__title')?.textContent?.trim();
    const companyWebsite = document.querySelector('.org-top-card-summary__website')?.textContent?.trim();
    const companyDesc = document.querySelector('.org-top-card-summary__description')?.textContent?.trim();

    if (companyName) result.name = companyName;
    if (companyWebsite) result.website = companyWebsite;
    if (companyDesc) result.description = companyDesc;
  }

  // Clean up website URL
  if (result.website && !result.website.startsWith('http')) {
    result.website = 'https://' + result.website;
  }

  return result;
}
