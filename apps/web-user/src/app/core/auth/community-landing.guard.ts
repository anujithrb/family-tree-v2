import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CommunityState } from '../state/community.state';

export const communityLandingGuard: CanActivateFn = () => {
  const communityState = inject(CommunityState);
  const router = inject(Router);

  const communities = communityState.communities();

  if (communities.length === 0) {
    return router.createUrlTree(['/wizard']);
  }

  return router.createUrlTree(['/communities', communities[0].id, 'tree']);
};
