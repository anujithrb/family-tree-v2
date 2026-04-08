export interface TempNode {
  tempId: string;
  name: string;
  gender: 'M' | 'F' | '';
  birthYear?: number;
  email?: string;
  isDeceased?: boolean;
  isSelf?: boolean;
}

export interface TempCouple {
  id: string;
  spouseAId: string;
  spouseBId: string;
}

export interface TempChild {
  coupleId: string;
  childId: string;
}

export interface WizardConfig {
  selfNode?: Partial<TempNode>;
  showAdminAssignment: boolean;
}

export interface WizardSubmission {
  communityName: string;
  nodes: TempNode[];
  couples: TempCouple[];
  children: TempChild[];
}
