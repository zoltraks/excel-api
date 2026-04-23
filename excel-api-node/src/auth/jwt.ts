// JWT token generation and validation

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import type { AccessConfig } from '../config/types.js';

export interface TokenPayload {
  sub: string; // subject (user ID or client ID)
  scope: string[];
  iat?: number;
  exp?: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export class JWTAuth {
  private secret: string;
  private issuer: string;
  private expirationMinutes: number;

  constructor(secret: string, issuer: string, expirationMinutes: number) {
    this.secret = secret;
    this.issuer = issuer;
    this.expirationMinutes = expirationMinutes;
  }

  generateToken(payload: TokenPayload): string {
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
      ...payload,
      iat: now,
      exp: now + this.expirationMinutes * 60,
      iss: this.issuer,
    };

    return jwt.sign(tokenPayload, this.secret);
  }

  verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret) as TokenPayload;
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  createTokenResponse(payload: TokenResponse): TokenResponse {
    return payload;
  }
}

export class OAuth2Handler {
  private accessConfig: AccessConfig;
  private jwtAuth: JWTAuth;

  constructor(accessConfig: AccessConfig, jwtAuth: JWTAuth) {
    this.accessConfig = accessConfig;
    this.jwtAuth = jwtAuth;
  }

  async handleClientCredentialsGrant(
    clientId: string,
    clientSecret: string
  ): Promise<TokenResponse> {
    const client = this.accessConfig.oauth2.clients.find(
      (c) => c.client_id === clientId && c.client_secret === clientSecret
    );

    if (!client) {
      throw new Error('Invalid client credentials');
    }

    const payload: TokenPayload = {
      sub: clientId,
      scope: client.scopes,
    };

    const accessToken = this.jwtAuth.generateToken(payload);

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600, // 1 hour
      scope: client.scopes.join(' '),
    };
  }

  async handlePasswordGrant(
    username: string,
    password: string
  ): Promise<TokenResponse> {
    const user = this.accessConfig.oauth2.users.find((u) => u.username === username);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      throw new Error('Invalid credentials');
    }

    const payload: TokenPayload = {
      sub: username,
      scope: user.scopes,
    };

    const accessToken = this.jwtAuth.generateToken(payload);

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600, // 1 hour
      scope: user.scopes.join(' '),
    };
  }
}

export class StaticTokenAuth {
  private tokens: Map<string, { name: string; scopes: string[] }>;

  constructor(accessConfig: AccessConfig) {
    this.tokens = new Map();
    for (const token of accessConfig.tokens.static) {
      this.tokens.set(token.token, {
        name: token.name,
        scopes: token.scopes,
      });
    }
  }

  verifyToken(token: string): { name: string; scopes: string[] } | null {
    const tokenData = this.tokens.get(token);
    return tokenData || null;
  }
}
