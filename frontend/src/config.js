// Dynamic Backend URL resolution:
// 1. Explicit VITE_BACKEND_URL environment variable (if provided)
// 2. Production Zoho Catalyst AppSail backend
// 3. Localhost fallback for local development
export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
    ? 'https://pagewise-backend-50047226045.development.catalystappsail.in'
    : 'http://localhost:8000');
