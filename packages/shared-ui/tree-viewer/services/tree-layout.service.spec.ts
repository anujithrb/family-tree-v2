import { TreeLayoutService } from './tree-layout.service';
import {
  DEFAULT_LAYOUT_CONSTANTS,
  LayoutConstants,
  LayoutCouple,
} from '../models/tree-layout.model';

describe('TreeLayoutService', () => {
  let service: TreeLayoutService;
  const C = DEFAULT_LAYOUT_CONSTANTS;

  beforeEach(() => {
    service = new TreeLayoutService();
  });

  it('should return empty result for no couples', () => {
    const result = service.computeLayout([], {});
    expect(result.couples).toEqual({});
    expect(result.soloNodes).toEqual({});
    expect(result.canvasWidth).toBe(0);
    expect(result.canvasHeight).toBe(0);
  });

  it('should compute layout for a root couple with one child', () => {
    const couples: LayoutCouple[] = [
      { id: 'c1', spouseAId: 'nA', spouseBId: 'nB', children: ['nC'] },
    ];
    const personCoupleMap: Record<string, string> = {};

    const result = service.computeLayout(couples, personCoupleMap);

    expect(result.couples['c1']).toBeDefined();
    expect(result.couples['c1'].gen).toBe(0);
    expect(result.couples['c1'].y).toBe(C.padding);
    expect(result.soloNodes['nC']).toBeDefined();
    expect(result.soloNodes['nC'].y).toBe(C.rowHeight + C.padding);
    expect(result.canvasWidth).toBeGreaterThan(0);
    expect(result.canvasHeight).toBeGreaterThan(0);
  });

  it('should handle a married child (two generations of couples)', () => {
    const couples: LayoutCouple[] = [
      { id: 'c1', spouseAId: 'nA', spouseBId: 'nB', children: ['nC'] },
      { id: 'c2', spouseAId: 'nC', spouseBId: 'nD', children: [] },
    ];
    const personCoupleMap: Record<string, string> = { nC: 'c2' };

    const result = service.computeLayout(couples, personCoupleMap);

    expect(result.couples['c1'].gen).toBe(0);
    expect(result.couples['c2'].gen).toBe(1);
  });

  it('should position solo children centered under their parent couple', () => {
    const couples: LayoutCouple[] = [
      { id: 'c1', spouseAId: 'nA', spouseBId: 'nB', children: ['nC', 'nD'] },
    ];
    const personCoupleMap: Record<string, string> = {};

    const result = service.computeLayout(couples, personCoupleMap);

    const soloC = result.soloNodes['nC'];
    const soloD = result.soloNodes['nD'];
    expect(soloC).toBeDefined();
    expect(soloD).toBeDefined();
    expect(soloD.x).toBeGreaterThan(soloC.x);
  });

  it('should accept custom layout constants', () => {
    const custom: LayoutConstants = {
      nodeWidth: 200,
      nodeHeight: 100,
      spouseGap: 20,
      subtreeGap: 60,
      rowHeight: 200,
      padding: 50,
    };
    const couples: LayoutCouple[] = [
      { id: 'c1', spouseAId: 'nA', spouseBId: 'nB', children: [] },
    ];

    const result = service.computeLayout(couples, {}, custom);

    expect(result.couples['c1'].y).toBe(custom.padding);
  });

  it('should handle three generations with mixed solo and coupled children', () => {
    const couples: LayoutCouple[] = [
      {
        id: 'c1',
        spouseAId: 'nA',
        spouseBId: 'nB',
        children: ['nC', 'nD', 'nE'],
      },
      { id: 'c2', spouseAId: 'nC', spouseBId: 'nF', children: ['nG'] },
    ];
    const personCoupleMap: Record<string, string> = { nC: 'c2' };

    const result = service.computeLayout(couples, personCoupleMap);

    expect(result.couples['c1'].gen).toBe(0);
    expect(result.couples['c2'].gen).toBe(1);
    expect(result.soloNodes['nD']).toBeDefined();
    expect(result.soloNodes['nE']).toBeDefined();
    expect(result.soloNodes['nG']).toBeDefined();
  });
});
