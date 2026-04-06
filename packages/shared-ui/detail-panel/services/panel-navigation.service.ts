import { Injectable, signal, computed } from '@angular/core';
import type { PanelState, PanelView, PanelHistoryEntry } from '../models/panel.model';
import type { TreePerson } from '../../tree-viewer/models/tree-data.model';

@Injectable({ providedIn: 'root' })
export class PanelNavigationService {
  private readonly state = signal<PanelState>({
    isOpen: false,
    view: null,
    selectedPerson: null,
    history: [],
  });

  readonly isOpen = computed(() => this.state().isOpen);
  readonly currentView = computed(() => this.state().view);
  readonly selectedPerson = computed(() => this.state().selectedPerson);
  readonly canGoBack = computed(() => this.state().history.length > 0);

  open(view: PanelView, person: TreePerson | null = null): void {
    this.state.update((s) => ({
      ...s,
      isOpen: true,
      view,
      selectedPerson: person,
      history: [],
    }));
  }

  navigate(view: PanelView, person: TreePerson | null = null): void {
    this.state.update((s) => {
      const currentView = s.view ?? view;
      const entry: PanelHistoryEntry = { view: currentView, person: s.selectedPerson };
      return {
        ...s,
        view,
        selectedPerson: person,
        history: [...s.history, entry],
      };
    });
  }

  back(): void {
    this.state.update((s) => {
      const history = [...s.history];
      const prev = history.pop();
      if (!prev) return s;
      return {
        ...s,
        view: prev.view,
        selectedPerson: prev.person,
        history,
      };
    });
  }

  close(): void {
    this.state.update((s) => ({
      ...s,
      isOpen: false,
      view: null,
      selectedPerson: null,
      history: [],
    }));
  }
}
