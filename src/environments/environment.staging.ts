import packageInfo from '../../package.json';

export const environment = {
  appVersion: packageInfo.version,
  production: false,
  
  // Staging API Configuration
  api: {
    baseUrl: 'https://staging-api.cineq.com/api',  // Your staging API
    timeout: 30000,
    retryAttempts: 3
  },
  
  // Authentication Configuration
  auth: {
    tokenKey: 'auth_token',
    refreshTokenKey: 'refresh_token',
    tokenExpiry: 24 * 60 * 60 * 1000,
  },
  
  // App Configuration
  app: {
    name: 'CineQ Dashboard (Staging)',
    logoUrl: 'assets/images/cineq/cineq-auth.png',
    defaultRoute: '/dashboard',
    loginRoute: '/login'
  },
  
  // Feature Flags
  features: {
    enableGoogleAuth: true,
    enableRegistration: true,
    enableRememberMe: true,
    enableForgotPassword: true
  }
};