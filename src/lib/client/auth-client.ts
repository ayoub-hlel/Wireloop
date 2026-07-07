import { createAuthClient } from 'better-auth/client';

function getBaseURL(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:5173';
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  basePath: "/api/auth",
});
