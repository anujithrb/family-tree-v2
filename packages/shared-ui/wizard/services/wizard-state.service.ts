import { Injectable, signal, computed } from '@angular/core';
import type {
  WizardState,
  WizardStep,
  WizardPerson,
  WizardCouple,
  WizardChild,
} from '../models/wizard.model';

@Injectable({ providedIn: 'root' })
export class WizardStateService {
  private readonly state = signal<WizardState>({
    step: 'name',
    communityName: '',
    people: [],
    couples: [],
    children: [],
    selectedNodeTempId: null,
  });

  readonly step = computed(() => this.state().step);
  readonly communityName = computed(() => this.state().communityName);
  readonly people = computed(() => this.state().people);
  readonly couples = computed(() => this.state().couples);
  readonly children = computed(() => this.state().children);
  readonly selectedNodeTempId = computed(() => this.state().selectedNodeTempId);

  setCommunityName(name: string): void {
    this.state.update((s) => ({ ...s, communityName: name }));
  }

  goToStep(step: WizardStep): void {
    this.state.update((s) => ({ ...s, step }));
  }

  addPerson(person: Omit<WizardPerson, 'tempId'>): WizardPerson {
    const tempId = `temp-${String(Date.now())}-${Math.random().toString(36).slice(2)}`;
    const newPerson: WizardPerson = { tempId, ...person };
    this.state.update((s) => ({ ...s, people: [...s.people, newPerson] }));
    return newPerson;
  }

  addCouple(personATempId: string, personBTempId: string): WizardCouple {
    const tempId = `couple-${String(Date.now())}`;
    const couple: WizardCouple = { tempId, personATempId, personBTempId, status: 'MARRIED' };
    this.state.update((s) => ({ ...s, couples: [...s.couples, couple] }));
    return couple;
  }

  addChild(coupleTempId: string, childTempId: string): void {
    const child: WizardChild = { coupleTempId, childTempId };
    this.state.update((s) => ({ ...s, children: [...s.children, child] }));
  }

  updatePerson(tempId: string, updates: Partial<Omit<WizardPerson, 'tempId'>>): void {
    this.state.update((s) => ({
      ...s,
      people: s.people.map((p) => (p.tempId === tempId ? { ...p, ...updates } : p)),
    }));
  }

  deletePerson(tempId: string): void {
    this.state.update((s) => ({
      ...s,
      people: s.people.filter((p) => p.tempId !== tempId),
      couples: s.couples.filter((c) => c.personATempId !== tempId && c.personBTempId !== tempId),
      children: s.children.filter((ch) => ch.childTempId !== tempId),
      selectedNodeTempId: s.selectedNodeTempId === tempId ? null : s.selectedNodeTempId,
    }));
  }

  selectNode(tempId: string | null): void {
    this.state.update((s) => ({ ...s, selectedNodeTempId: tempId }));
  }

  reset(): void {
    this.state.set({
      step: 'name',
      communityName: '',
      people: [],
      couples: [],
      children: [],
      selectedNodeTempId: null,
    });
  }
}
