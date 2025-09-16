# ⚠️ Google Cloud Billing Setup Required

## Issue
The Google Cloud Vision API requires billing to be enabled on your project before it can be used.

## Solution
1. Go to [Google Cloud Console Billing](https://console.developers.google.com/billing/enable?project=647098724257)
2. Or go to your project → "Billing" in the left menu
3. Enable billing by adding a payment method
4. Wait a few minutes for changes to propagate

## Important Notes
- **Free Tier**: You get 1,000 Vision API requests per month for FREE
- **Costs**: After free tier, it's only $1.50 per 1,000 images
- **Your project ID**: `egg-market` (Project #647098724257)

## After Enabling Billing
Run this test again to verify everything works:
```bash
GOOGLE_APPLICATION_CREDENTIALS=/Users/sergiolopez/Desktop/eggmarket-webapp/eggmarket-vision-key.json node test-vision.js
```

## Cost Estimate
For your use case:
- Processing 100 carter documents/month = ~$0.15
- Processing 1,000 documents/month = ~$1.50

Very affordable for the functionality you get!