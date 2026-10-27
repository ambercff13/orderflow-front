import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from './auth';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideRouter([])],
    });
    authService = TestBed.inject(AuthService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('accepts an unexpired base64url token', () => {
    const payload = JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 3600,
      marker: '😀',
    });
    const encodedPayload = btoa(
      Array.from(new TextEncoder().encode(payload), (byte) => String.fromCharCode(byte)).join(''),
    )
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    localStorage.setItem('access_token', `header.${encodedPayload}.signature`);

    expect(authService.isAuthenticated()).toBe(true);
  });

  it('rejects an expired token', () => {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 }));
    localStorage.setItem('access_token', `header.${payload}.signature`);

    expect(authService.isAuthenticated()).toBe(false);
  });

  it('rejects a token without a valid expiration claim', () => {
    const payload = btoa(JSON.stringify({ sub: 'user@example.com' }));
    localStorage.setItem('access_token', `header.${payload}.signature`);

    expect(authService.isAuthenticated()).toBe(false);
  });
});
