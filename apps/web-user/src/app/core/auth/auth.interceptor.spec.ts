import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        AuthService,
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should add Authorization header when access token exists', () => {
    // Login first
    authService.verifyMagicLink('tok').subscribe();
    httpMock
      .expectOne('/api/auth/verify/tok')
      .flush({ accessToken: 'my-token', refreshToken: 'r' });

    http.get('/api/test').subscribe();
    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-token');
    req.flush({});
  });

  it('should not add Authorization header when no token', () => {
    http.get('/api/test').subscribe();
    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should not add Authorization header for auth endpoints', () => {
    authService.verifyMagicLink('tok').subscribe();
    const req = httpMock.expectOne('/api/auth/verify/tok');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ accessToken: 'a', refreshToken: 'r' });
  });

  it('should retry request after refreshing token on 401', () => {
    // Set up an authenticated session
    authService.verifyMagicLink('tok').subscribe();
    httpMock
      .expectOne('/api/auth/verify/tok')
      .flush({ accessToken: 'expired-token', refreshToken: 'r1' });

    // Make a request that will get a 401
    let result: unknown;
    http.get('/api/data').subscribe((res) => (result = res));

    // First attempt returns 401
    httpMock
      .expectOne('/api/data')
      .flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    // Interceptor should trigger a refresh
    const refreshReq = httpMock.expectOne('/api/auth/refresh');
    expect(refreshReq.request.method).toBe('POST');
    refreshReq.flush({ accessToken: 'new-token' });

    // Interceptor should retry the original request with the new token
    const retryReq = httpMock.expectOne('/api/data');
    expect(retryReq.request.headers.get('Authorization')).toBe('Bearer new-token');
    retryReq.flush({ data: 'success' });

    expect(result).toEqual({ data: 'success' });
  });

  it('should logout and redirect on refresh failure', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    // Set up an authenticated session
    authService.verifyMagicLink('tok').subscribe();
    httpMock
      .expectOne('/api/auth/verify/tok')
      .flush({ accessToken: 'expired-token', refreshToken: 'r1' });

    // Make a request that will get a 401
    http.get('/api/data').subscribe({ error: () => {} });

    // First attempt returns 401
    httpMock
      .expectOne('/api/data')
      .flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    // Refresh also fails
    httpMock
      .expectOne('/api/auth/refresh')
      .flush({ error: 'Invalid refresh token' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.isAuthenticated()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should not attempt refresh for auth endpoint 401s', () => {
    http.get('/api/auth/verify/bad-token').subscribe({ error: () => {} });

    httpMock
      .expectOne('/api/auth/verify/bad-token')
      .flush({ error: 'Invalid token' }, { status: 401, statusText: 'Unauthorized' });

    httpMock.verify(); // No refresh request should be made
  });
});
