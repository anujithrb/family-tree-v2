import { Component, input } from '@angular/core';

@Component({
  selector: 'ft-tree-connector',
  standalone: true,
  template: `
    <g class="connector">
      <!-- Horizontal bar between spouses -->
      <line
        [attr.x1]="spouseAX() + nodeWidth()"
        [attr.y1]="coupleY() + nodeHeight() / 2"
        [attr.x2]="spouseBX()"
        [attr.y2]="coupleY() + nodeHeight() / 2"
        class="spouse-line"
      />
      @if (hasChildren()) {
        <!-- Vertical drop from couple mid-point -->
        <line
          [attr.x1]="coupleCx()"
          [attr.y1]="coupleY() + nodeHeight() / 2"
          [attr.x2]="coupleCx()"
          [attr.y2]="coupleY() + nodeHeight() / 2 + dropLength()"
          class="drop-line"
        />
      }
    </g>
  `,
  styles: [
    `
      .spouse-line,
      .drop-line {
        stroke: var(--ft-border);
        stroke-width: 1.5;
      }
    `,
  ],
})
export class TreeConnectorComponent {
  readonly spouseAX = input(0);
  readonly spouseBX = input(0);
  readonly coupleY = input(0);
  readonly coupleCx = input(0);
  readonly nodeWidth = input(120);
  readonly nodeHeight = input(60);
  readonly hasChildren = input(false);
  readonly dropLength = input(30);
}
