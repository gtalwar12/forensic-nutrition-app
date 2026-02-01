# Privacy Policy

**Forensic Nutrition PWA**
*Last updated: January 2025*

This document explains how your data is handled when using the Forensic Nutrition PWA.

---

## Image Processing

**How it works:**
When you upload a food photo, the image is sent to **Anthropic's Claude API** via **OpenRouter** for AI-powered food identification and nutritional analysis.

**What this means:**
- Your food images are transmitted to Anthropic's servers for processing
- Anthropic may retain images temporarily for API request handling
- See [Anthropic's Privacy Policy](https://www.anthropic.com/privacy) for their data handling practices
- See [OpenRouter's Terms](https://openrouter.ai/terms) for their API proxy policies

---

## Image Storage

**Where images are stored:**
All uploaded images are stored **locally on your own server** in the `./uploads/` directory.

- Images never leave your server after the initial API call
- No cloud backup or third-party storage is used
- You have full control over image retention and deletion
- Delete images anytime by removing files from `./uploads/`

---

## Data Collection

**What we collect:**
- Meal photos (stored locally)
- Nutritional data derived from AI analysis (stored in local SQLite database)
- Timestamps of meals logged

**What we DON'T collect:**
- Personal identifying information
- Location data
- Usage analytics
- Device fingerprints

---

## Data Sharing

**We do not sell your data.**

Your nutritional data and food images are:
- Never sold to third parties
- Never shared with advertisers
- Never used for marketing purposes
- Only transmitted to Anthropic/OpenRouter for the explicit purpose of food analysis

---

## Cookies

**Minimal cookie usage:**
This app only uses cookies for essential PWA functionality:

- Service worker registration
- Offline caching
- Session persistence

We do not use:
- Tracking cookies
- Analytics cookies
- Third-party cookies
- Advertising cookies

---

## USDA Data

When available, nutritional information is retrieved from the **USDA FoodData Central** database. This is a public API and no personal data is sent with these requests—only food search terms.

---

## Your Rights

Since all data is stored locally on your server, you have complete control:

- **Access**: Query `nutrition.db` directly with SQLite
- **Delete**: Remove meals via the app or delete database entries
- **Export**: Copy the SQLite database for portability
- **Purge**: Delete `nutrition.db` and `./uploads/` to remove all data

---

## Self-Hosted Nature

This is a **self-hosted application**. You are responsible for:

- Securing your server and database
- Managing access to the application
- Backing up your data if desired
- Configuring HTTPS for external access

---

## Contact

For questions about this privacy policy or data handling, open an issue on the project repository.

---

*This privacy policy applies to the Forensic Nutrition PWA self-hosted application.*
