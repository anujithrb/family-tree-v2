import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommunityState } from '../../state/community.state';
import { AuthService } from '../../auth/auth.service';
import { CommunitySwitcherComponent } from '../community-switcher/community-switcher.component';

@Component({
  selector: 'ft-header',
  standalone: true,
  imports: [RouterLink, CommunitySwitcherComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  readonly communityState = inject(CommunityState);
  readonly authService = inject(AuthService);
}
