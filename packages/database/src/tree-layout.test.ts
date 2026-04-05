import { computeTreeLayout, LayoutConstants } from './tree-layout';

const DEFAULTS: LayoutConstants = {
  NODE_W: 120,
  NODE_H: 60,
  SPOUSE_GAP: 12,
  SUBTREE_GAP: 48,
  ROW_HEIGHT: 120,
  PADDING: 40,
};

describe('computeTreeLayout', () => {
  it('computes layout for a simple root couple with one child', () => {
    const couples = [
      {
        id: 'c1',
        spouseAId: 'nA',
        spouseBId: 'nB',
        children: ['nC'],
      },
    ];
    const personCoupleMap: Record<string, string> = {}; // nC has no couple

    const result = computeTreeLayout(couples, personCoupleMap, DEFAULTS);

    expect(result.couples['c1']).toBeDefined();
    expect(result.couples['c1'].gen).toBe(0);
    expect(result.couples['c1'].y).toBe(DEFAULTS.PADDING);
    expect(result.soloNodes['nC']).toBeDefined();
    expect(result.soloNodes['nC'].y).toBe(DEFAULTS.ROW_HEIGHT + DEFAULTS.PADDING);
    expect(result.canvasWidth).toBeGreaterThan(0);
    expect(result.canvasHeight).toBeGreaterThan(0);
  });

  it('handles a married child (two generations of couples)', () => {
    const couples = [
      { id: 'c1', spouseAId: 'nA', spouseBId: 'nB', children: ['nC'] },
      { id: 'c2', spouseAId: 'nC', spouseBId: 'nD', children: [] },
    ];
    const personCoupleMap: Record<string, string> = { nC: 'c2' };

    const result = computeTreeLayout(couples, personCoupleMap, DEFAULTS);

    expect(result.couples['c1'].gen).toBe(0);
    expect(result.couples['c2'].gen).toBe(1);
  });
});
