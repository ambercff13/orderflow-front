import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LoginResponse {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}/api/auth`;

  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        this.saveTokens(this.getAccessToken(response), response.refreshToken);
      }),
    );
  }

  refreshToken(): Observable<LoginResponse> {
    const tokenStored = this.getRefreshToken();
    const refreshToken = tokenStored ?? undefined;

    return this.http.post<LoginResponse>(`${this.apiUrl}/refresh`, { refreshToken }).pipe(
      tap((response) => {
        this.saveTokens(this.getAccessToken(response), response.refreshToken || tokenStored || '');
      }),
    );
  }

  private getAccessToken(response: LoginResponse): string {
    const accessToken = response.accessToken ?? response.token;
    if (typeof accessToken !== 'string' || !accessToken.trim()) {
      throw new Error('A resposta da API não contém um access token.');
    }

    return accessToken;
  }

  saveTokens(token: string, refreshToken?: string): void {
    localStorage.setItem('access_token', token);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) return false;

    try {
      const payloadSegment = tokenParts[1];
      if (!payloadSegment) return false;

      const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const binaryPayload = atob(paddedBase64);
      const bytes = Uint8Array.from(binaryPayload, (character) => character.charCodeAt(0));
      const payload = JSON.parse(new TextDecoder().decode(bytes));

      if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
        return false;
      }

      const isExpired = Date.now() >= payload.exp * 1000;
      return !isExpired;
    } catch {
      return false;
    }
  }

  getPayload(): Record<string, unknown> | null {
    const token = this.getToken();
    if (!token) return null;

    const tokenParts = token.split('.');
    if (tokenParts.length !== 3 || !tokenParts[1]) return null;

    try {
      const base64 = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const bytes = Uint8Array.from(atob(paddedBase64), (c) => c.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return null;
    }
  }

  getRoles(): string[] {
    const roles = this.getPayload()?.['roles'];
    return Array.isArray(roles) ? roles.filter((r): r is string => typeof r === 'string') : [];
  }

  hasRole(role: string): boolean {
    return this.getRoles().some((r) => r === role || r === `ROLE_${role}`);
  }

  isManager(): boolean {
    return this.hasRole('MANAGER');
  }
}
