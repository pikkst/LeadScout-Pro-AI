# LeadScout PRO AI - Chrome Extension

Quick add leads to LeadScout PRO AI directly from LinkedIn, Google Maps, and any website.

## Installation

### Developer Mode (Local Testing)

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension` folder from this project
5. The extension icon should appear in your Chrome toolbar

## Usage

### Popup
1. Click the extension icon in the Chrome toolbar
2. Fill in company details manually or click "Auto-fill from Page"
3. Click "Save Lead" to add to your LeadScout PRO AI pipeline

### Auto-fill
The extension automatically detects company information from:
- LinkedIn company pages
- Google Maps listings
- Any website with meta tags (og:title, og:description, etc.)

### Context Menu
Right-click on any page and select "Add to LeadScout PRO AI" to quickly add a lead from the current page.

## Configuration

1. Open the extension popup
2. Click the settings icon (or visit Settings in the main app)
3. In the main app, create an API key with the `write` scope under **Settings → API Keys**
4. Enter your LeadScout PRO AI API URL (default: `http://localhost:3000`) and the API key
5. Save the connection settings; the raw API key is shown by the app only once

## Supported Sites

- LinkedIn company pages
- Google Maps business listings
- Any website with Open Graph meta tags
- Any webpage (manual entry with auto-detected domain)

## Privacy

This extension only sends data to your LeadScout PRO AI instance. No data is sent to third parties.
