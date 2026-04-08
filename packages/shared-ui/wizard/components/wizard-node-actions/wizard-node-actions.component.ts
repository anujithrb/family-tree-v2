import { Component, input, output } from '@angular/core';
import type { TempNode } from '../../models/wizard.model';

@Component({
  selector: 'ft-wizard-node-actions',
  standalone: true,
  imports: [],
  templateUrl: './wizard-node-actions.component.html',
  styleUrl: './wizard-node-actions.component.scss',
})
export class WizardNodeActionsComponent {
  readonly node = input.required<TempNode>();
  readonly canAddSpouse = input(true);
  readonly canAddChild = input(true);
  readonly canAddSibling = input(true);
  readonly canAddParents = input(true);
  readonly canRemove = input(true);

  readonly addSpouse = output();
  readonly addChild = output();
  readonly addSibling = output();
  readonly addParents = output();
  readonly remove = output();
}
