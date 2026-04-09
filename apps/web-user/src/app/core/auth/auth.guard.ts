import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { CommunityState } from '../state/community.state';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/auth/login']);
};

export const communityMemberGuard: CanActivateFn = (route) => {
  const communityState = inject(CommunityState);
  const router = inject(Router);

  const communityId = route.paramMap.get('id');
  const isMember = communityState.communities().some((c) => c.id === communityId);

  if (isMember) {
    return true;
  }

  return router.createUrlTree(['/']);
};
