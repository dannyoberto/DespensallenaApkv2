/**
 * Allowed Domains Configuration
 * Centralized configuration for domains that should open within the WebView
 */

// Primary domain
export const PRIMARY_DOMAIN = 'despensallena.com';

// Google OAuth domains
export const GOOGLE_OAUTH_DOMAINS = [
  'google.com',
  'googleapis.com',
  'gstatic.com',
  'accounts.google.com',
];

// Short URL services for metrics tracking
export const SHORT_URL_DOMAINS = [
  'tify.cc',           // Cutt.ly custom domain
  'cutt.ly',           // Cutt.ly main domain
  'bit.ly',            // Bitly
  'tinyurl.com',       // TinyURL
  'short.link',        // Short.link
  'is.gd',             // Is.gd
  'v.gd',              // V.gd
  'ow.ly',             // Hootsuite
  'goo.gl',            // Google URL Shortener
  'rebrand.ly',        // Rebrandly
  'buff.ly',           // Buffer
  'fb.me',             // Facebook
  't.co',              // Twitter
  'lnkd.in',           // LinkedIn
  'amzn.to',           // Amazon
];

// Payment and checkout domains
export const PAYMENT_DOMAINS = [
  'paypal.com',
  'stripe.com',
  'mercadopago.com',
  'squareup.com',
  'razorpay.com',
];

// Social media domains
export const SOCIAL_DOMAINS = [
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'linkedin.com',
  'youtube.com',
  'tiktok.com',
];

// All allowed domains combined
export const ALL_ALLOWED_DOMAINS = [
  PRIMARY_DOMAIN,
  ...GOOGLE_OAUTH_DOMAINS,
  ...SHORT_URL_DOMAINS,
  ...PAYMENT_DOMAINS,
  ...SOCIAL_DOMAINS,
];

/**
 * Check if a URL is allowed to open within the WebView
 * @param url - The URL to check
 * @returns boolean - True if allowed, false otherwise
 */
export function isUrlAllowed(url: string): boolean {
  // Allow data and file URLs
  if (url.startsWith('data:') || url.startsWith('file:')) {
    return true;
  }

  // Check if URL contains any allowed domain
  return ALL_ALLOWED_DOMAINS.some(domain => url.includes(domain));
}

/**
 * Get the category of an allowed domain
 * @param url - The URL to categorize
 * @returns string - Category name or 'unknown'
 */
export function getDomainCategory(url: string): string {
  if (url.includes(PRIMARY_DOMAIN)) return 'primary';
  if (GOOGLE_OAUTH_DOMAINS.some(domain => url.includes(domain))) return 'google-oauth';
  if (SHORT_URL_DOMAINS.some(domain => url.includes(domain))) return 'short-url';
  if (PAYMENT_DOMAINS.some(domain => url.includes(domain))) return 'payment';
  if (SOCIAL_DOMAINS.some(domain => url.includes(domain))) return 'social';
  return 'unknown';
}

/**
 * Log domain access for analytics
 * @param url - The URL being accessed
 * @param category - The domain category
 */
export function logDomainAccess(url: string, category: string): void {
  if (__DEV__) {
    console.log(`🌐 Domain access: ${category} - ${url}`);
  }
}
