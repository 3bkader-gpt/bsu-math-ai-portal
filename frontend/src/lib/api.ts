/**
 * Centralized API configuration for the BSU Mathematics Portal.
 * Reads the backend URL from:
 * 1. localStorage override ('bsu_api_url') if set by admin
 * 2. NEXT_PUBLIC_API_URL environment variable
 * 3. Localhost fallback when running locally
 */

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem('bsu_api_url');
    if (override && override.trim()) {
      return override.trim().replace(/\/+$/, '');
    }
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // Production cloud default: Render backend 24/7
  return 'https://bsu-math-api.onrender.com';
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
