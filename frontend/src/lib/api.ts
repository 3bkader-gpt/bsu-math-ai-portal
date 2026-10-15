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
    // If running on localhost in browser, default to local FastAPI port 8000
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://127.0.0.1:8000';
    }
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  return 'http://127.0.0.1:8000';
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
