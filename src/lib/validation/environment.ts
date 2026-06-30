/**
 * Environment Validation Utility
 */
export interface EnvironmentValidationResult {
  valid: boolean;
  issues: EnvironmentIssue[];
  recommendations: EnvironmentRecommendation[];
  configuration: EnvironmentConfiguration;
}

export interface EnvironmentIssue {
  type: 'MISSING_ENV_VAR' | 'INVALID_FORMAT' | 'PLACEHOLDER_VALUE';
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  variable?: string;
}

export interface EnvironmentRecommendation {
  action: string;
  command?: string;
  documentation?: string;
}

export interface EnvironmentConfiguration {
  database: { configured: boolean };
  server: { arduinoUrl: string };
  deployment: { bucketName: string; siteName: string; useEmulator: boolean };
}

export function validateEnvironment(): EnvironmentValidationResult {
  const issues: EnvironmentIssue[] = [];
  const recommendations: EnvironmentRecommendation[] = [];

  const databaseUrl = typeof process !== 'undefined' ? (process.env.DATABASE_URL || '') : '';
  if (databaseUrl && !databaseUrl.startsWith('postgresql://')) {
    issues.push({
      type: 'INVALID_FORMAT',
      description: 'DATABASE_URL is not a valid PostgreSQL connection string',
      severity: 'CRITICAL',
      variable: 'DATABASE_URL'
    });
  }

  const configuration: EnvironmentConfiguration = {
    database: { configured: !!databaseUrl },
    server: { arduinoUrl: "http://localhost:3001" },
    deployment: {
      bucketName: "arduino-workflow-builder-lesson-dev",
      siteName: "arduino-workflow-builder-dev",
      useEmulator: true
    }
  };

  return { valid: issues.length === 0, issues, recommendations, configuration };
}

export function validateBrowserEnvironment(): {
  userAgent: string; browserName: string; browserVersion: string;
  platform: string; cookiesEnabled: boolean;
  localStorageAvailable: boolean; sessionStorageAvailable: boolean;
} {
  const userAgent = navigator.userAgent;
  let browserName = 'Unknown', browserVersion = 'Unknown';
  if (userAgent.includes('Chrome')) {
    browserName = 'Chrome';
    browserVersion = userAgent.match(/Chrome\/([0-9.]+)/)?.[1] || 'Unknown';
  } else if (userAgent.includes('Firefox')) {
    browserName = 'Firefox';
    browserVersion = userAgent.match(/Firefox\/([0-9.]+)/)?.[1] || 'Unknown';
  }
  let localStorageAvailable = false, sessionStorageAvailable = false;
  try { localStorage.setItem('t','t'); localStorage.removeItem('t'); localStorageAvailable = true; } catch {}
  try { sessionStorage.setItem('t','t'); sessionStorage.removeItem('t'); sessionStorageAvailable = true; } catch {}
  return { userAgent, browserName, browserVersion, platform: navigator.platform, cookiesEnabled: navigator.cookieEnabled, localStorageAvailable, sessionStorageAvailable };
}

export function logEnvironmentValidation(): void {
  const result = validateEnvironment();
  console.group('🔧 Environment Validation');
  result.issues.forEach(i => console.log(`${i.severity === 'CRITICAL' ? '❌' : '⚠️'} ${i.variable}: ${i.description}`));
  console.log(`Status: ${result.valid ? '✅ OK' : '❌ Issues'}`);
  console.groupEnd();
}
