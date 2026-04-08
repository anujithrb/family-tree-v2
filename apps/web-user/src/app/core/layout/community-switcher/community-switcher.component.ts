import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommunityState } from '../../state/community.state';

@Component({
  selector: 'ft-community-switcher',
  standalone: true,
  templateUrl: './community-switcher.component.html',
  styleUrl: './community-switcher.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunitySwitcherComponent {
  readonly communityState = inject(CommunityState);
  private readonly router = inject(Router);

  readonly isOpen = signal(false);

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  select(communityId: string): void {
    this.communityState.setActive(communityId);
    this.isOpen.set(false);
    void this.router.navigate(['/communities', communityId, 'tree']);
  }
}
