export interface BloodlineInput {
  spouse1Id: string;
  spouse2Id: string;
  spouse1HasParents: boolean;
  spouse2HasParents: boolean;
}

export interface BloodlineResult {
  spouseAId: string; // bloodline (renders on left, connector target)
  spouseBId: string; // married-in (renders on right)
}

/**
 * Compute which spouse is bloodline (spouseA) and which is married-in (spouseB).
 * Bloodline = has a CoupleChild row in this community (was born into tree).
 * If neither or both have parents, fall back to storage order (spouse1 = A).
 */
export function computeBloodlineStatus(input: BloodlineInput): BloodlineResult {
  if (input.spouse1HasParents && !input.spouse2HasParents) {
    return { spouseAId: input.spouse1Id, spouseBId: input.spouse2Id };
  }
  if (input.spouse2HasParents && !input.spouse1HasParents) {
    return { spouseAId: input.spouse2Id, spouseBId: input.spouse1Id };
  }
  // Root couple or both bloodline — use storage order
  return { spouseAId: input.spouse1Id, spouseBId: input.spouse2Id };
}
