import type { TreePerson } from '../../tree-viewer/models/tree-data.model';

export type PanelView =
  | 'person-detail'
  | 'person-edit'
  | 'add-person'
  | 'add-couple'
  | 'relationship';

export interface PanelState {
  isOpen: boolean;
  view: PanelView | null;
  selectedPerson: TreePerson | null;
  history: PanelHistoryEntry[];
}

export interface PanelHistoryEntry {
  view: PanelView;
  person: TreePerson | null;
}
