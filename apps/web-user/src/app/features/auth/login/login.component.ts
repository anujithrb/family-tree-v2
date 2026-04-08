import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'ft-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);

  readonly email = signal('');
  readonly displayName = signal('');
  readonly sent = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  onSubmit(): void {
    this.loading.set(true);
    this.error.set(null);
    this.auth.sendInvite(this.email(), this.displayName()).subscribe({
      next: () => {
        this.sent.set(true);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        const msg =
          typeof err === 'object' && err !== null && 'error' in err
            ? ((err as { error?: { message?: string } }).error?.message ?? 'Failed to send invite')
            : 'Failed to send invite';
        this.error.set(msg);
        this.loading.set(false);
      },
    });
  }
}
