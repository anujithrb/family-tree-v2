import { computeBloodlineStatus } from './bloodline';

describe('computeBloodlineStatus', () => {
  it('returns spouse1 as bloodline when spouse1 has parents', () => {
    const result = computeBloodlineStatus({
      spouse1Id: 'node-a',
      spouse2Id: 'node-b',
      spouse1HasParents: true,
      spouse2HasParents: false,
    });
    expect(result).toEqual({ spouseAId: 'node-a', spouseBId: 'node-b' });
  });

  it('returns spouse2 as bloodline when spouse2 has parents', () => {
    const result = computeBloodlineStatus({
      spouse1Id: 'node-a',
      spouse2Id: 'node-b',
      spouse1HasParents: false,
      spouse2HasParents: true,
    });
    expect(result).toEqual({ spouseAId: 'node-b', spouseBId: 'node-a' });
  });

  it('returns storage order when neither has parents (root couple)', () => {
    const result = computeBloodlineStatus({
      spouse1Id: 'node-a',
      spouse2Id: 'node-b',
      spouse1HasParents: false,
      spouse2HasParents: false,
    });
    expect(result).toEqual({ spouseAId: 'node-a', spouseBId: 'node-b' });
  });

  it('returns storage order when both have parents', () => {
    const result = computeBloodlineStatus({
      spouse1Id: 'node-a',
      spouse2Id: 'node-b',
      spouse1HasParents: true,
      spouse2HasParents: true,
    });
    expect(result).toEqual({ spouseAId: 'node-a', spouseBId: 'node-b' });
  });
});
