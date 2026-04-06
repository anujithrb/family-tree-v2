import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import type { UserProfile } from '@family-tree/shared-ui';

interface InviteResponse {
  message: string;
  magicLinkToken: string;
  userId: string;
}

interface VerifyResponse {
  accessToken: string;
  refreshToken: string;
}

interface RefreshResponse {
  accessToken: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private accessToken = signal<string | null>(null);
  private refreshTokenValue = signal<string | null>(null);

  readonly user = signal<UserProfile | null>(null);
  readonly isAuthenticated = computed(() => this.accessToken() !== null);

  getAccessToken(): string | null {
    return this.accessToken();
  }

  sendInvite(email: string, displayName: string): Observable<InviteResponse> {
    return this.http.post<InviteResponse>('/api/auth/invite', { email, displayName });
  }

  verifyMagicLink(token: string): Observable<VerifyResponse> {
    return this.http.get<VerifyResponse>(`/api/auth/verify/${token}`).pipe(
      tap((res) => {
        this.accessToken.set(res.accessToken);
        this.refreshTokenValue.set(res.refreshToken);
      }),
    );
  }

  refreshToken(): Observable<RefreshResponse> {
    return this.http
      .post<RefreshResponse>('/api/auth/refresh', {
        refreshToken: this.refreshTokenValue(),
      })
      .pipe(
        tap((res) => {
          this.accessToken.set(res.accessToken);
        }),
      );
  }

  loadProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>('/api/users/me').pipe(
      tap((profile) => {
        this.user.set(profile);
      }),
    );
  }

  logout(): void {
    this.accessToken.set(null);
    this.refreshTokenValue.set(null);
    this.user.set(null);
  }
}
