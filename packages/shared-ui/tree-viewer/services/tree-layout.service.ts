import {
  DEFAULT_LAYOUT_CONSTANTS,
  LayoutConstants,
  LayoutCouple,
  CoupleLayout,
  SoloNodeLayout,
  TreeLayoutResult,
} from '../models/tree-layout.model';

interface InternalCouple extends LayoutCouple {
  gen: number;
  subtreeWidth: number;
  cx: number;
}

export class TreeLayoutService {
  computeLayout(
    couples: LayoutCouple[],
    personCoupleMap: Record<string, string>,
    constants: LayoutConstants = DEFAULT_LAYOUT_CONSTANTS,
  ): TreeLayoutResult {
    const { nodeWidth, nodeHeight, spouseGap, subtreeGap, rowHeight, padding } = constants;
    const coupleWidth = nodeWidth * 2 + spouseGap;

    if (couples.length === 0) {
      return { couples: {}, soloNodes: {}, canvasWidth: 0, canvasHeight: 0 };
    }

    // Build internal map
    const coupleById: Partial<Record<string, InternalCouple>> = {};
    for (const c of couples) {
      coupleById[c.id] = { ...c, gen: -1, subtreeWidth: 0, cx: 0 };
    }

    // Phase 1: Generation assignment (BFS from root = first couple)
    const root = coupleById[couples[0].id] as InternalCouple;
    root.gen = 0;
    const queue: InternalCouple[] = [root];

    while (queue.length > 0) {
      const couple = queue.shift() as InternalCouple;
      for (const childId of couple.children) {
        const childCoupleId = personCoupleMap[childId];
        if (childCoupleId && coupleById[childCoupleId] && coupleById[childCoupleId].gen === -1) {
          coupleById[childCoupleId].gen = couple.gen + 1;
          queue.push(coupleById[childCoupleId]);
        }
      }
    }

    // Phase 2: Subtree widths (bottom-up)
    const maxGen = Math.max(
      ...Object.values(coupleById)
        .filter((c): c is InternalCouple => !!c)
        .map((c) => c.gen)
        .filter((g) => g >= 0),
    );

    for (let gen = maxGen; gen >= 0; gen--) {
      const genCouples = Object.values(coupleById).filter(
        (c): c is InternalCouple => !!c && c.gen === gen,
      );

      for (const couple of genCouples) {
        const childCouples = couple.children
          .map((cid) => personCoupleMap[cid])
          .filter((cpId): cpId is string => Boolean(cpId))
          .map((cpId) => coupleById[cpId])
          .filter((cc): cc is InternalCouple => Boolean(cc));

        const soloCount = couple.children.filter((cid) => !personCoupleMap[cid]).length;
        const soloWidth = soloCount > 0 ? soloCount * nodeWidth + (soloCount - 1) * subtreeGap : 0;

        if (childCouples.length === 0) {
          couple.subtreeWidth = Math.max(coupleWidth, soloWidth || coupleWidth);
        } else {
          const coupledWidth =
            childCouples.reduce((s, cc) => s + cc.subtreeWidth, 0) +
            (childCouples.length - 1) * subtreeGap;
          couple.subtreeWidth = Math.max(coupleWidth, coupledWidth, soloWidth);
        }
      }
    }

    // Phase 3: X/Y positions (top-down BFS)
    root.cx = root.subtreeWidth / 2 + padding;
    const posQueue: InternalCouple[] = [root];
    const soloNodes: Record<string, SoloNodeLayout> = {};

    while (posQueue.length > 0) {
      const couple = posQueue.shift() as InternalCouple;

      const childCouples = couple.children
        .map((cid) => personCoupleMap[cid])
        .filter((cpId): cpId is string => Boolean(cpId))
        .map((cpId) => coupleById[cpId])
        .filter((cc): cc is InternalCouple => Boolean(cc));

      if (childCouples.length > 0) {
        const totalW =
          childCouples.reduce((s, cc) => s + cc.subtreeWidth, 0) +
          (childCouples.length - 1) * subtreeGap;
        let x = couple.cx - totalW / 2;
        for (const cc of childCouples) {
          cc.cx = x + cc.subtreeWidth / 2;
          x += cc.subtreeWidth + subtreeGap;
          posQueue.push(cc);
        }
      }

      // Position solo leaf children
      const soloIds = couple.children.filter((cid) => !personCoupleMap[cid]);
      if (soloIds.length > 0) {
        const totalW = soloIds.length * nodeWidth + (soloIds.length - 1) * subtreeGap;
        let x = couple.cx - totalW / 2;
        for (const nodeId of soloIds) {
          soloNodes[nodeId] = {
            x,
            y: (couple.gen + 1) * rowHeight + padding,
            cx: x + nodeWidth / 2,
          };
          x += nodeWidth + subtreeGap;
        }
      }
    }

    // Phase 4: Build result
    const coupleLayouts: Record<string, CoupleLayout> = {};
    for (const c of Object.values(coupleById)) {
      if (!c || c.gen < 0) continue;
      coupleLayouts[c.id] = {
        gen: c.gen,
        subtreeWidth: c.subtreeWidth,
        cx: c.cx,
        y: c.gen * rowHeight + padding,
        yBot: c.gen * rowHeight + padding + nodeHeight,
        spouseAX: c.cx - spouseGap / 2 - nodeWidth,
        spouseBX: c.cx + spouseGap / 2,
      };
    }

    const hasSoloNodes = Object.keys(soloNodes).length > 0;
    const maxGenForHeight = hasSoloNodes ? maxGen + 1 : maxGen;

    return {
      couples: coupleLayouts,
      soloNodes,
      canvasWidth: root.subtreeWidth + padding * 2,
      canvasHeight: (maxGenForHeight + 1) * rowHeight + padding * 2,
    };
  }
}
