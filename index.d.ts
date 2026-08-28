export class OauthError extends Error {
  code: string;
  errorDescription: string;
  errorUri: string;
  statusCode: number;
  cause?: Error;
}

export interface AccessToken {
  token_type: string;
  scope: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
  openid: string;
}

export interface UserInfo {
  openid: string;
  email: string;
  employee_id: string;
  chi_name: string;
  eng_name: string;
  department: string;
}

export const HOST_PROD: string;
export const HOST_QA: string;
export const HOST_DEV: string;
export const LANG_SC: string;
export const LANG_EN: string;

export class Oauth {
  constructor(clientId: string, clientSecret: string, redirectUri: string, host?: string);
  generateRedirectURL(state: string, lang?: string): string;
  code2accessToken(code: string): Promise<AccessToken>;
  refreshAccessToken(refreshToken: string): Promise<AccessToken>;
  token2userInfo(token: string): Promise<UserInfo>;
}
