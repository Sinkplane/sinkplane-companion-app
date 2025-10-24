/**
 * Floatplane API Configuration
 */

export const API_BASE_URL = 'https://www.floatplane.com';
export const API_VERSION = 'v3';

export const API_ENDPOINTS = {
  LOGIN: `/api/${API_VERSION}/auth/login`,
  LOGOUT: `/api/${API_VERSION}/auth/logout`,
  SIGNUP: `/api/${API_VERSION}/auth/signup`,
  CHECK_2FA: `/api/${API_VERSION}/auth/checkFor2faLogin`,
  CAPTCHA_INFO: `/api/${API_VERSION}/auth/captcha/info`,
  SPOOF_BEGIN: `/api/${API_VERSION}/auth/spoof/begin`,
  SPOOF_END: `/api/${API_VERSION}/auth/spoof/end`,
} as const;
