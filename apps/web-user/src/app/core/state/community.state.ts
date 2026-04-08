import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { CommunityApiService } from '../api/community-api.service';
import type { Community } from '@family-tree/shared-ui';

@Injectable({ providedIn: 'root' })
export class CommunityState {
  private readonly communityApi = inject(CommunityApiService);

  readonly communities = signal<Community[]>([]);
  readonly activeId = signal<string | null>(null);
  readonly loading = signal(false);

  readonly active = computed(() => {
    const id = this.activeId();
    return this.communities().find((c) => c.id === id) ?? null;
  });

  loadCommunities(): Observable<Community[]> {
    this.loading.set(true);
    return this.communityApi.getMyCommunities().pipe(
      tap({
        next: (list) => {
          this.communities.set(list);
          if (list.length > 0 && !this.activeId()) {
            this.activeId.set(list[0].id);
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      }),
    );
  }

  setActive(communityId: string): void {
    this.activeId.set(communityId);
  }
}
