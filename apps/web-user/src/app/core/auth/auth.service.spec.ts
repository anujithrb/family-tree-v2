import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should start with no user and not authenticated', () => {
    expect(service.user()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should send invite and return response', () => {
    service.sendInvite('test@example.com', 'Test User').subscribe((res) => {
      expect(res.message).toContain('Invite sent');
    });

    const req = httpMock.expectOne('/api/auth/invite');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'test@example.com', displayName: 'Test User' });
    req.flush({ message: 'Invite sent.', magicLinkToken: 'tok', userId: 'u1' });
  });

  it('should verify magic link and store tokens', () => {
    service.verifyMagicLink('magic-token').subscribe((res) => {
      expect(res.accessToken).toBe('access-123');
      expect(service.isAuthenticated()).toBe(true);
    });

    const req = httpMock.expectOne('/api/auth/verify/magic-token');
    expect(req.request.method).toBe('GET');
    req.flush({ accessToken: 'access-123', refreshToken: 'refresh-456' });
  });

  it('should refresh access token', () => {
    service.verifyMagicLink('tok').subscribe();
    httpMock.expectOne('/api/auth/verify/tok').flush({
      accessToken: 'a1',
      refreshToken: 'r1',
    });

    service.refreshToken().subscribe((res) => {
      expect(res.accessToken).toBe('a2');
    });

    const req = httpMock.expectOne('/api/auth/refresh');
    expect(req.request.method).toBe('POST');
    req.flush({ accessToken: 'a2' });
  });

  it('should clear state on logout', () => {
    service.verifyMagicLink('tok').subscribe();
    httpMock.expectOne('/api/auth/verify/tok').flush({
      accessToken: 'a1',
      refreshToken: 'r1',
    });

    expect(service.isAuthenticated()).toBe(true);
    service.logout();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.user()).toBeNull();
  });
});
