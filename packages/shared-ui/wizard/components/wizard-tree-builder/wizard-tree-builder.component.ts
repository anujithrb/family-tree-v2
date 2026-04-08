import { Component, input, output, signal } from '@angular/core';
import { WizardStateService } from '../../services/wizard-state.service';
import { WizardNodeActionsComponent } from '../wizard-node-actions/wizard-node-actions.component';
import type { TempNode } from '../../models/wizard.model';

@Component({
  selector: 'ft-wizard-tree-builder',
  standalone: true,
  imports: [WizardNodeActionsComponent],
  templateUrl: './wizard-tree-builder.component.html',
  styleUrl: './wizard-tree-builder.component.scss',
})
export class WizardTreeBuilderComponent {
  readonly state = input.required<WizardStateService>();
  readonly back = output();
  readonly next = output();

  readonly selectedNodeId = signal<string | null>(null);

  selectNode(tempId: string): void {
    this.selectedNodeId.set(this.selectedNodeId() === tempId ? null : tempId);
  }

  selectedNode(): TempNode | null {
    const id = this.selectedNodeId();
    if (!id) return null;
    return (
      this.state()
        .nodes()
        .find((n) => n.tempId === id) ?? null
    );
  }

  onAddSpouse(): void {
    const nodeId = this.selectedNodeId();
    if (!nodeId) return;
    const newNode: TempNode = {
      tempId: `node-${String(Date.now())}`,
      name: 'New Person',
      gender: '',
    };
    this.state().addNode(newNode);
    this.state().addCouple(nodeId, newNode.tempId);
  }

  onAddChild(): void {
    const nodeId = this.selectedNodeId();
    if (!nodeId) return;
    const couples = this.state().couples();
    const existingCouple = couples.find((c) => c.spouseAId === nodeId || c.spouseBId === nodeId);
    const newChild: TempNode = {
      tempId: `node-${String(Date.now())}`,
      name: 'New Child',
      gender: '',
    };
    this.state().addNode(newChild);
    if (existingCouple) {
      this.state().addChild(existingCouple.id, newChild.tempId);
    } else {
      // Create a solo-parent couple placeholder
      const spouseB = `solo-${nodeId}`;
      const soloNode: TempNode = { tempId: spouseB, name: '', gender: '' };
      this.state().addNode(soloNode);
      this.state().addCouple(nodeId, spouseB);
      const newCouple = this.state()
        .couples()
        .find((c) => c.spouseAId === nodeId && c.spouseBId === spouseB);
      if (newCouple) {
        this.state().addChild(newCouple.id, newChild.tempId);
      }
    }
  }

  onAddSibling(): void {
    const nodeId = this.selectedNodeId();
    if (!nodeId) return;
    const newSibling: TempNode = {
      tempId: `node-${String(Date.now())}`,
      name: 'New Person',
      gender: '',
    };
    this.state().addNode(newSibling);
    // Link as sibling by finding the same parent couple
    const parentChild = this.state()
      .children()
      .find((c) => c.childId === nodeId);
    if (parentChild) {
      this.state().addChild(parentChild.coupleId, newSibling.tempId);
    }
    this.selectedNodeId.set(null);
  }

  onAddParents(): void {
    const nodeId = this.selectedNodeId();
    if (!nodeId) return;
    const parent1: TempNode = {
      tempId: `node-${String(Date.now())}-p1`,
      name: 'Parent 1',
      gender: '',
    };
    const parent2: TempNode = {
      tempId: `node-${String(Date.now())}-p2`,
      name: 'Parent 2',
      gender: '',
    };
    this.state().addNode(parent1);
    this.state().addNode(parent2);
    this.state().addCouple(parent1.tempId, parent2.tempId);
    const newCouple = this.state()
      .couples()
      .find((c) => c.spouseAId === parent1.tempId && c.spouseBId === parent2.tempId);
    if (newCouple) {
      this.state().addChild(newCouple.id, nodeId);
    }
  }

  onRemoveNode(): void {
    const nodeId = this.selectedNodeId();
    if (!nodeId) return;
    this.state().removeNode(nodeId);
    this.selectedNodeId.set(null);
  }
}
