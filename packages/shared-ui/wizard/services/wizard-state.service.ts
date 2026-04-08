import { Injectable, signal, computed } from '@angular/core';
import type {
  TempNode,
  TempCouple,
  TempChild,
  WizardConfig,
  WizardSubmission,
} from '../models/wizard.model';

@Injectable({ providedIn: 'root' })
export class WizardStateService {
  private readonly _step = signal(1);
  private readonly _communityName = signal('');
  private readonly _nodes = signal<TempNode[]>([]);
  private readonly _couples = signal<TempCouple[]>([]);
  private readonly _children = signal<TempChild[]>([]);

  readonly currentStep = computed(() => this._step());
  readonly communityName = computed(() => this._communityName());
  readonly nodes = computed(() => this._nodes());
  readonly couples = computed(() => this._couples());
  readonly children = computed(() => this._children());

  initWithConfig(config: WizardConfig): void {
    this._step.set(1);
    this._communityName.set('');
    this._children.set([]);
    this._couples.set([]);
    if (config.selfNode) {
      const self: TempNode = {
        tempId: 'self',
        name: config.selfNode.name ?? '',
        gender: config.selfNode.gender ?? '',
        birthYear: config.selfNode.birthYear,
        isSelf: true,
      };
      this._nodes.set([self]);
    } else {
      this._nodes.set([]);
    }
  }

  setCommunityName(name: string): void {
    this._communityName.set(name);
  }

  nextStep(): void {
    this._step.update((s) => Math.min(s + 1, 3));
  }

  prevStep(): void {
    this._step.update((s) => Math.max(s - 1, 1));
  }

  addNode(node: TempNode): void {
    this._nodes.update((nodes) => {
      // If node has a tempId already in the list, replace; otherwise add
      const existing = nodes.findIndex((n) => n.tempId === node.tempId);
      if (existing >= 0) {
        const updated = [...nodes];
        updated[existing] = node;
        return updated;
      }
      return [...nodes, node];
    });
  }

  addCouple(spouseAId: string, spouseBId: string): void {
    const id = `couple-${String(Date.now())}`;
    this._couples.update((c) => [...c, { id, spouseAId, spouseBId }]);
  }

  addChild(coupleId: string, childId: string): void {
    this._children.update((c) => [...c, { coupleId, childId }]);
  }

  removeNode(tempId: string): void {
    this._nodes.update((nodes) => nodes.filter((n) => n.tempId !== tempId));
    this._couples.update((couples) =>
      couples.filter((c) => c.spouseAId !== tempId && c.spouseBId !== tempId),
    );
    this._children.update((children) => children.filter((c) => c.childId !== tempId));
  }

  buildSubmission(): WizardSubmission {
    return {
      communityName: this._communityName(),
      nodes: this._nodes(),
      couples: this._couples(),
      children: this._children(),
    };
  }

  reset(): void {
    this._step.set(1);
    this._communityName.set('');
    this._nodes.set([]);
    this._couples.set([]);
    this._children.set([]);
  }
}
