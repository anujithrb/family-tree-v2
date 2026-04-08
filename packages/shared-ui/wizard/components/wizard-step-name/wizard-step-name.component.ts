import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'ft-wizard-step-name',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './wizard-step-name.component.html',
  styleUrl: './wizard-step-name.component.scss',
})
export class WizardStepNameComponent {
  readonly name = input.required<string>();
  readonly nameChange = output<string>();
  readonly next = output();

  onNameInput(event: Event): void {
    this.nameChange.emit((event.target as HTMLInputElement).value);
  }

  onSubmit(): void {
    if (this.name().trim()) {
      this.next.emit();
    }
  }
}
