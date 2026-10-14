/**
 * Centralized API configuration for the BSU Mathematics Portal.
 * Reads the public backend URL from the NEXT_PUBLIC_API_URL environment variable,
 * with a fallback to the local development server (http://127.0.0.1:8000).
 */

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
).replace(/\/+$/, '');

/**
 * Returns a full URL for any API endpoint or media stream path.
 * Handles leading/trailing slashes gracefully.
 */
export function getApiUrl(path: string): string {
  if (!path) return API_BASE_URL;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}
