export interface TreePerson {
  nodeId: string;
  personId: string;
  profileId: string;
  name: string;
  birthYear: number | null;
  deathYear: number | null;
  isDeceased: boolean;
  gender: string | null;
  profilePhoto: string | null;
  isRegisteredUser: boolean;
}

export interface TreeCouple {
  id: string;
  spouseAId: string;
  spouseBId: string;
  status: string;
  marriageDate: string | null;
  divorceDate: string | null;
  children: string[];
}

export interface TreeResponse {
  communityId: string;
  communityName: string;
  people: TreePerson[];
  couples: TreeCouple[];
}

export interface Community {
  id: string;
  name: string;
  createdAt: string;
}

export interface CommunityDetail extends Community {
  nodeCount: number;
  coupleCount: number;
  admins: CommunityAdmin[];
}

export interface CommunityAdmin {
  userId: string;
  displayName: string;
  role: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  profilePhoto: string | null;
  status: string;
  person: {
    id: string;
    profileId: string;
    name: string;
    birthYear: number | null;
    deathYear: number | null;
    isDeceased: boolean;
    gender: string | null;
  } | null;
}

export interface RelationshipResult {
  path: string[] | null;
  edges?: { from: string; to: string; type: string }[];
  message?: string;
}
