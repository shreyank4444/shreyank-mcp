export interface Env {
  DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  OAUTH_ISSUER: string;
  OAUTH_TOKEN_HASH_SECRET: string;
}

export interface OAuthClient {
  client_id: string;
  client_name: string | null;
  redirect_uris: string;
  grant_types: string;
  response_types: string;
  scope: string;
  client_id_issued_at: number;
}

export interface OAuthTransaction {
  state_hash: string;
  client_id: string;
  redirect_uri: string;
  client_state: string | null;
  code_challenge: string;
  scope: string;
  resource: string;
  expires_at: number;
}

export interface OAuthCode {
  code_hash: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  scope: string;
  resource: string;
  github_login: string;
  expires_at: number;
  consumed_at: number | null;
}

export interface OAuthToken {
  token_hash: string;
  token_type: "access" | "refresh";
  client_id: string;
  scope: string;
  resource: string;
  github_login: string;
  expires_at: number;
  revoked_at: number | null;
}
