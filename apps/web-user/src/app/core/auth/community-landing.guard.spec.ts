import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { communityLandingGuard } from './community-landing.guard';
import { CommunityState } from '../state/community.state';

describe('communityLandingGuard', () => {
  let router: Router;
  let communityState: CommunityState;
  let httpMock: HttpTestingController;

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
          { path: 'wizard', component: dummyComponent },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          { path: 'communities/:id/tree', component: dummyComponent },
          {
            path: '',
            canActivate: [communityLandingGuard],
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            component: dummyComponent,
          },
        ]),
        CommunityState,
      ],
    });
    router = TestBed.inject(Router);
    communityState = TestBed.inject(CommunityState);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should redirect to /wizard when user has no communities', async () => {
    const navigateSpy = vi.spyOn(router, 'createUrlTree');
    communityState.communities.set([]);

    const mockRoute = {} as ActivatedRouteSnapshot;
    const mockState = {} as RouterStateSnapshot;

    await TestBed.runInInjectionContext(() => communityLandingGuard(mockRoute, mockState));
    expect(navigateSpy).toHaveBeenCalledWith(['/wizard']);
  });

  it('should redirect to first community tree when user has communities', async () => {
    const navigateSpy = vi.spyOn(router, 'createUrlTree');
    communityState.communities.set([
      { id: 'c1', name: 'Fam 1', createdAt: '2026-01-01' },
      { id: 'c2', name: 'Fam 2', createdAt: '2026-02-01' },
    ]);

    const mockRoute = {} as ActivatedRouteSnapshot;
    const mockState = {} as RouterStateSnapshot;

    await TestBed.runInInjectionContext(() => communityLandingGuard(mockRoute, mockState));
    expect(navigateSpy).toHaveBeenCalledWith(['/communities', 'c1', 'tree']);
  });
});
