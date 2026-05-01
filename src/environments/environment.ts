// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import packageInfo from '../../package.json';

export const environment = {
  appVersion: packageInfo.version,
  production: false,

  // API Configuration (like Laravel .env)
  api: {
    baseUrl: 'http://localhost:8080/api',  // Your local Spring Boot API
    timeout: 30000,                        // Request timeout
    retryAttempts: 2                       // Number of retry attempts
  },

  // Authentication Configuration
  auth: {
    tokenKey: 'jwt-auth-token',               // Cookie name used by Laravel server
    refreshTokenKey: 'jwt-refresh-token',     // Refresh token cookie name  
    tokenExpiry: 1 * 60 * 60 * 1000,    // 1 hour in milliseconds
  },

  // App Configuration
  app: {
    name: 'CineQ Dashboard',
    logoUrl: 'assets/images/cineq/cineq-auth.png',
    defaultRoute: '/dashboard',
    loginRoute: '/login'
  },

  // Feature Flags (like Laravel config)
  features: {
    enableGoogleAuth: false,
    enableRegistration: true,
    enableRememberMe: true,
    enableForgotPassword: true
  },

  // Supabase Configuration

  supabase: {
     storageBaseUrl: 'https://afbesiqwuxmtykgenkca.supabase.co/storage/v1'
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.