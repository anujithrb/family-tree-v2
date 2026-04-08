import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CommunityState } from '../../../core/state/community.state';

@Component({
  selector: 'ft-verify',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="verify-page">
      @if (error()) {
        <h1>Verification Failed</h1>
        <p>{{ error() }}</p>
      } @else {
        <p>Verifying your magic link...</p>
      }
    </div>
  `,
  styles: `
    .verify-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100%;
    }
  `,
})
export class VerifyComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly communityState = inject(CommunityState);

  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      void this.router.navigate(['/auth/login']);
      return;
    }

    this.auth
      .verifyMagicLink(token)
      .pipe(
        switchMap(() => this.auth.loadProfile()),
        switchMap(() => this.communityState.loadCommunities()),
      )
      .subscribe({
        next: (communities) => {
          if (communities.length === 0) {
            void this.router.navigate(['/wizard']);
          } else {
            void this.router.navigate(['/communities', communities[0].id, 'tree']);
          }
        },
        error: () => {
          void this.router.navigate(['/auth/login']);
        },
      });
  }
}
