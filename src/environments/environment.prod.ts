import packageInfo from '../../package.json';

export const environment = {
  appVersion: packageInfo.version,
  production: true,
  
  // Production API Configuration
  api: {
    baseUrl: 'https://api.cineq.com/api',    // Your production API
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
    name: 'CineQ Dashboard',
    logoUrl: 'assets/images/cineQ-stext.jpg',
    defaultRoute: '/dashboard',
    loginRoute: '/login'
  },
  
  // Feature Flags
  features: {
    enableGoogleAuth: true,
    enableRegistration: false,  // Disable registration in production
    enableRememberMe: true,
    enableForgotPassword: true
  }
};
