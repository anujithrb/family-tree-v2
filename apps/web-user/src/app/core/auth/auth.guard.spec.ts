import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dummyComponent: any = {};

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),

        provideRouter([
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          { path: 'protected', canActivate: [authGuard], component: dummyComponent },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          { path: 'auth/login', component: dummyComponent },
        ]),
        AuthService,
      ],
    });
    TestBed.inject(Router);
    TestBed.inject(AuthService);
  });

  it('should redirect to login when not authenticated', async () => {
    const mockRoute = {} as ActivatedRouteSnapshot;
    const mockState = {} as RouterStateSnapshot;
    const result = await TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
    // Guard returns UrlTree to /auth/login
    expect(result).toBeTruthy();
    if (typeof result !== 'boolean') {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      expect(String(result)).toContain('auth/login');
    }
  });
});
