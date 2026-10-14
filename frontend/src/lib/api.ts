/**
 * Centralized API configuration for the BSU Mathematics Portal.
 * Reads the public backend URL from:
 * 1. localStorage override ('bsu_api_url') if set
 * 2. NEXT_PUBLIC_API_URL environment variable
 * 3. Active public Cloudflare Tunnel URL as robust production fallback
 */

const DEFAULT_TUNNEL_URL = 'https://optical-butler-corp-began.trycloudflare.com';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem('bsu_api_url');
    if (override && override.trim()) {
      return override.trim().replace(/\/+$/, '');
    }
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim() && !envUrl.includes('127.0.0.1') && !envUrl.includes('localhost')) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  return DEFAULT_TUNNEL_URL;
}

export const API_BASE_URL = getApiBaseUrl();

/**
 * Returns a full URL for any API endpoint or media stream path.
 * Handles leading/trailing slashes gracefully.
 */
export function getApiUrl(path: string): string {
  const base = getApiBaseUrl();
  if (!path) return base;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
