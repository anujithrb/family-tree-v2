export type WizardStep = 'name' | 'tree-builder' | 'review';

export interface WizardPerson {
  tempId: string;
  name: string;
  gender: string | null;
  birthYear: number | null;
  isDeceased: boolean;
}

export interface WizardCouple {
  tempId: string;
  personATempId: string;
  personBTempId: string;
  status: string;
}

export interface WizardChild {
  coupleTempId: string;
  childTempId: string;
}

export interface WizardState {
  step: WizardStep;
  communityName: string;
  people: WizardPerson[];
  couples: WizardCouple[];
  children: WizardChild[];
  selectedNodeTempId: string | null;
}
