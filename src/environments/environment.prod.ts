import packageInfo from '../../package.json';

export const environment = {
  appVersion: packageInfo.version,
  production: true,
  
  // Production API Configuration
  api: {
    baseUrl: 'https://api.awal.ct.ws/api',    // Your production API
    timeout: 30000,
    retryAttempts: 1
  },
  
  // Authentication Configuration
  auth: {
     tokenKey: 'jwt-auth-token',               // Cookie name used by Laravel server
    refreshTokenKey: 'jwt-refresh-token', 
    tokenExpiry: 1 * 60 * 60 * 1000,
  },
  
  // App Configuration
  app: {
    name: 'CineQ Dashboard',
    logoUrl: 'assets/images/cineq/cineq-auth.png',
    defaultRoute: '/dashboard',
    loginRoute: '/login'
  },
  
  // Feature Flags
  features: {
    enableGoogleAuth: true,
    enableRegistration: false,  // Disable registration in production
    enableRememberMe: true,
    enableForgotPassword: true
  },
  
  supabase: {
    storageBaseUrl: 'https://eidprwpfigaiuxcucbdh.supabase.co/storage/v1'
  }
};
