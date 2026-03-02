/**
 * API base URL helper.
 *
 * In development, Vite proxies /api → localhost:3001 so the base is empty.
 * In production (Vercel), set VITE_API_URL to the Railway backend URL
 * (e.g. https://maieutic-server.up.railway.app) — NO trailing slash.
 */
export const API_BASE = import.meta.env.VITE_API_URL ?? '';
