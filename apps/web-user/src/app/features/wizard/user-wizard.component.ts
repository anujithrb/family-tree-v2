import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  WizardShellComponent,
  type WizardConfig,
  type WizardSubmission,
} from '@family-tree/shared-ui';
import { AuthService } from '../../core/auth/auth.service';
import { CommunityApiService } from '../../core/api/community-api.service';
import { CommunityState } from '../../core/state/community.state';

@Component({
  selector: 'ft-user-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WizardShellComponent],
  templateUrl: './user-wizard.component.html',
  styleUrl: './user-wizard.component.scss',
})
export class UserWizardComponent {
  private readonly auth = inject(AuthService);
  private readonly communityApi = inject(CommunityApiService);
  private readonly communityState = inject(CommunityState);
  private readonly router = inject(Router);

  readonly wizardConfig = computed<WizardConfig>(() => ({
    selfNode: {
      name: this.auth.user()?.displayName ?? '',
    },
    showAdminAssignment: false,
  }));

  readonly error = signal<string | null>(null);

  onSubmit(submission: WizardSubmission): void {
    this.error.set(null);
    this.communityApi.createCommunityWithTree(submission).subscribe({
      next: (community) => {
        this.communityState.setActive(community.id);
        void this.router.navigate(['/communities', community.id, 'tree']);
      },
      error: () => {
        this.error.set('Failed to create community. Please try again.');
      },
    });
  }
}
