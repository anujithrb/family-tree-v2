import { Component, input, output } from '@angular/core';

@Component({
  selector: 'ft-side-panel',
  standalone: true,
  templateUrl: './side-panel.component.html',
  styleUrl: './side-panel.component.scss',
})
export class SidePanelComponent {
  readonly isOpen = input(false);
  readonly closed = output();

  onClose(): void {
    this.closed.emit();
  }
}
