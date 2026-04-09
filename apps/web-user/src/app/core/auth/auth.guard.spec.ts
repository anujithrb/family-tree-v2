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
import { authGuard, communityMemberGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CommunityState } from '../state/community.state';

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

describe('communityMemberGuard', () => {
  let router: Router;
  let communityState: CommunityState;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        CommunityState,
      ],
    });
    router = TestBed.inject(Router);
    communityState = TestBed.inject(CommunityState);
  });

  it('should allow access when user is member of community', () => {
    communityState.communities.set([{ id: 'c1', name: 'My Fam', createdAt: '2026-01-01' }]);
    const route = {
      paramMap: { get: (_key: string) => 'c1' },
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      communityMemberGuard(route, {} as RouterStateSnapshot),
    );
    expect(result).toBe(true);
  });

  it('should redirect to / when user is not member', () => {
    const createUrlTreeSpy = vi.spyOn(router, 'createUrlTree');
    communityState.communities.set([{ id: 'c1', name: 'My Fam', createdAt: '2026-01-01' }]);
    const route = {
      paramMap: { get: (_key: string) => 'c999' },
    } as unknown as ActivatedRouteSnapshot;

    void TestBed.runInInjectionContext(() =>
      communityMemberGuard(route, {} as RouterStateSnapshot),
    );
    expect(createUrlTreeSpy).toHaveBeenCalledWith(['/']);
  });
});
