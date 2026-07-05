import { createAuthClient } from 'better-auth/client';
import { PUBLIC_APP_URL } from '$env/static/public';

export const authClient = createAuthClient({
  baseURL: PUBLIC_APP_URL || 'http://localhost:5173',
  basePath: "/api/auth",
});
