import { Component, input, output } from '@angular/core';

export type BottomSheetState = 'hidden' | 'peek' | 'expanded';

@Component({
  selector: 'ft-bottom-sheet',
  standalone: true,
  templateUrl: './bottom-sheet.component.html',
  styleUrl: './bottom-sheet.component.scss',
})
export class BottomSheetComponent {
  readonly state = input<BottomSheetState>('hidden');
  readonly stateChange = output<BottomSheetState>();
  readonly closed = output();

  onExpand(): void {
    this.stateChange.emit('expanded');
  }

  onCollapse(): void {
    this.stateChange.emit('peek');
  }

  onClose(): void {
    this.closed.emit();
  }
}
