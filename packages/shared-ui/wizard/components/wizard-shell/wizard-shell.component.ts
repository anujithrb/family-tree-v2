import { Component, input, output, OnInit } from '@angular/core';
import { WizardStateService } from '../../services/wizard-state.service';
import type { WizardConfig, WizardSubmission } from '../../models/wizard.model';
import { WizardStepNameComponent } from '../wizard-step-name/wizard-step-name.component';
import { WizardTreeBuilderComponent } from '../wizard-tree-builder/wizard-tree-builder.component';
import { WizardReviewComponent } from '../wizard-review/wizard-review.component';

@Component({
  selector: 'ft-wizard-shell',
  standalone: true,
  imports: [WizardStepNameComponent, WizardTreeBuilderComponent, WizardReviewComponent],
  templateUrl: './wizard-shell.component.html',
  styleUrl: './wizard-shell.component.scss',
})
export class WizardShellComponent implements OnInit {
  readonly config = input.required<WizardConfig>();
  readonly submitted = output<WizardSubmission>();

  readonly state = new WizardStateService();

  ngOnInit(): void {
    this.state.initWithConfig(this.config());
  }

  onNameChange(name: string): void {
    this.state.setCommunityName(name);
  }

  onNext(): void {
    this.state.nextStep();
  }

  onBack(): void {
    this.state.prevStep();
  }

  onSubmit(): void {
    this.submitted.emit(this.state.buildSubmission());
  }
}
