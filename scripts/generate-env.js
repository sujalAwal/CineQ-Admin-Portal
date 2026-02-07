/**
 * Script to generate environment.prod.ts from Render environment variables
 * This prevents committing sensitive data to GitHub
 */

const fs = require('fs');
const path = require('path');

// Read package.json for version
const packageJson = require('../package.json');

// Get environment variables from Render (or fallback to defaults for local dev)
const env = {
  // API Configuration
  API_BASE_URL: process.env.API_BASE_URL || '',
  API_TIMEOUT: process.env.API_TIMEOUT || '30000',
  API_RETRY_ATTEMPTS: process.env.API_RETRY_ATTEMPTS || '1',
  
  // Auth Configuration
  AUTH_TOKEN_KEY: process.env.AUTH_TOKEN_KEY || 'jwt-auth-token',
  AUTH_REFRESH_TOKEN_KEY: process.env.AUTH_REFRESH_TOKEN_KEY || 'jwt-refresh-token',
  AUTH_TOKEN_EXPIRY: process.env.AUTH_TOKEN_EXPIRY || '3', 
  
  // App Configuration
  APP_NAME: process.env.APP_NAME || 'CineQ Dashboard',
  APP_LOGO_URL: process.env.APP_LOGO_URL || 'assets/images/cineq/cineq-auth.png',
  APP_DEFAULT_ROUTE: process.env.APP_DEFAULT_ROUTE || '/dashboard',
  APP_LOGIN_ROUTE: process.env.APP_LOGIN_ROUTE || '/login',
  
  // Feature Flags
  FEATURE_ENABLE_GOOGLE_AUTH: process.env.FEATURE_ENABLE_GOOGLE_AUTH || 'true',
  FEATURE_ENABLE_REGISTRATION: process.env.FEATURE_ENABLE_REGISTRATION || 'false',
  FEATURE_ENABLE_REMEMBER_ME: process.env.FEATURE_ENABLE_REMEMBER_ME || 'true',
  FEATURE_ENABLE_FORGOT_PASSWORD: process.env.FEATURE_ENABLE_FORGOT_PASSWORD || 'true',
  
  // Supabase Configuration
  SUPABASE_STORAGE_BASE_URL: process.env.SUPABASE_STORAGE_BASE_URL || ''
};

// Generate the environment.prod.ts content
const environmentContent = `import packageInfo from '../../package.json';

export const environment = {
  appVersion: packageInfo.version,
  production: true,
  
  // Production API Configuration
  api: {
    baseUrl: '${env.API_BASE_URL}',
    timeout: ${parseInt(env.API_TIMEOUT)},
    retryAttempts: ${parseInt(env.API_RETRY_ATTEMPTS)}
  },
  
  // Authentication Configuration
  auth: {
    tokenKey: '${env.AUTH_TOKEN_KEY}',
    refreshTokenKey: '${env.AUTH_REFRESH_TOKEN_KEY}',
    tokenExpiry: ${parseInt(env.AUTH_TOKEN_EXPIRY)}
  },
  
  // App Configuration
  app: {
    name: '${env.APP_NAME}',
    logoUrl: '${env.APP_LOGO_URL}',
    defaultRoute: '${env.APP_DEFAULT_ROUTE}',
    loginRoute: '${env.APP_LOGIN_ROUTE}'
  },
  
  // Feature Flags
  features: {
    enableGoogleAuth: ${env.FEATURE_ENABLE_GOOGLE_AUTH === 'true'},
    enableRegistration: ${env.FEATURE_ENABLE_REGISTRATION === 'true'},
    enableRememberMe: ${env.FEATURE_ENABLE_REMEMBER_ME === 'true'},
    enableForgotPassword: ${env.FEATURE_ENABLE_FORGOT_PASSWORD === 'true'}
  },
  
  supabase: {
    storageBaseUrl: '${env.SUPABASE_STORAGE_BASE_URL}'
  }
};
`;

// Write to file
const envFilePath = path.join(__dirname, '../src/environments/environment.prod.ts');
fs.writeFileSync(envFilePath, environmentContent, 'utf8');

console.log('✅ Generated environment.prod.ts from environment variables');
console.log('📝 File written to:', envFilePath);

// Log which env vars were used (without sensitive values)
console.log('\n📋 Environment variables used:');
console.log('  API_BASE_URL:', env.API_BASE_URL ? '✓ Set' : '✗ Using default');
console.log('  AUTH_TOKEN_KEY:', env.AUTH_TOKEN_KEY ? '✓ Set' : '✗ Using default');
console.log('  SUPABASE_STORAGE_BASE_URL:', env.SUPABASE_STORAGE_BASE_URL ? '✓ Set' : '✗ Using default');

