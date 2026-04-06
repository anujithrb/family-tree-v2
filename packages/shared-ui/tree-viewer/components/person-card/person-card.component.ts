import { Component, input, output } from '@angular/core';
import type { TreePerson } from '../../models/tree-data.model';

@Component({
  selector: 'ft-person-card',
  standalone: true,
  template: `
    <g
      [attr.transform]="'translate(' + x() + ',' + y() + ')'"
      class="person-card"
      [class.deceased]="person().isDeceased"
      [class.male]="person().gender === 'MALE'"
      [class.female]="person().gender === 'FEMALE'"
      (click)="cardClick.emit(person())"
      style="cursor: pointer"
    >
      <rect [attr.width]="width()" [attr.height]="height()" rx="6" ry="6" class="card-bg" />
      @if (person().profilePhoto) {
        <image
          [attr.href]="person().profilePhoto"
          [attr.width]="height()"
          [attr.height]="height()"
          preserveAspectRatio="xMidYMid slice"
        />
      } @else {
        <circle
          [attr.cx]="height() / 2"
          [attr.cy]="height() / 2"
          [attr.r]="height() / 2 - 8"
          class="avatar-placeholder"
        />
      }
      <text [attr.x]="height() + 8" [attr.y]="height() / 2 - 4" class="person-name">
        {{ person().name }}
      </text>
      @if (person().birthYear) {
        <text [attr.x]="height() + 8" [attr.y]="height() / 2 + 12" class="person-years">
          {{ person().birthYear }}{{ person().deathYear ? '–' + person().deathYear : '' }}
        </text>
      }
    </g>
  `,
  styleUrl: './person-card.component.scss',
})
export class PersonCardComponent {
  readonly person = input.required<TreePerson>();
  readonly x = input(0);
  readonly y = input(0);
  readonly width = input(120);
  readonly height = input(60);

  readonly cardClick = output<TreePerson>();
}
