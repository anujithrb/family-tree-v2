import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { UserApiService } from '../../core/api/user-api.service';

@Component({
  selector: 'ft-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  private readonly auth = inject(AuthService);
  private readonly userApi = inject(UserApiService);

  readonly displayName = signal('');

  constructor() {
    effect(() => {
      this.displayName.set(this.auth.user()?.displayName ?? '');
    });
  }
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly error = signal<string | null>(null);

  onSave(): void {
    this.saving.set(true);
    this.saved.set(false);
    this.error.set(null);
    this.userApi
      .updateProfile({ displayName: this.displayName() })
      .pipe(switchMap(() => this.auth.loadProfile()))
      .subscribe({
        next: () => {
          this.saved.set(true);
          this.saving.set(false);
        },
        error: () => {
          this.error.set('Failed to save profile');
          this.saving.set(false);
        },
      });
  }
}
