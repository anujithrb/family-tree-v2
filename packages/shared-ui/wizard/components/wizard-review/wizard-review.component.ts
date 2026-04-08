import { Component, input, output } from '@angular/core';
import { WizardStateService } from '../../services/wizard-state.service';

@Component({
  selector: 'ft-wizard-review',
  standalone: true,
  imports: [],
  templateUrl: './wizard-review.component.html',
  styleUrl: './wizard-review.component.scss',
})
export class WizardReviewComponent {
  readonly state = input.required<WizardStateService>();
  readonly showAdminAssignment = input(false);
  readonly back = output();
  // eslint-disable-next-line @angular-eslint/no-output-native
  readonly submit = output();
}
