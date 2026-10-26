// Dynamic Backend URL resolution:
// 1. Explicit VITE_BACKEND_URL environment variable (if provided)
// 2. Production Render backend when running on Vercel/Netlify/custom domain
// 3. Localhost fallback for local development
export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
    ? 'https://documind-backend-b03l.onrender.com'
    : 'http://localhost:8000');
