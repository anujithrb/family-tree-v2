export interface LayoutConstants {
  NODE_W: number;
  NODE_H: number;
  SPOUSE_GAP: number;
  SUBTREE_GAP: number;
  ROW_HEIGHT: number;
  PADDING: number;
}

export interface LayoutCouple {
  id: string;
  spouseAId: string;
  spouseBId: string;
  children: string[]; // nodeIds
}

interface CoupleLayout {
  gen: number;
  subtreeWidth: number;
  cx: number;
  y: number;
  yBot: number;
  spouseAX: number;
  spouseBX: number;
}

interface SoloNodeLayout {
  x: number;
  y: number;
  cx: number;
}

export interface TreeLayoutResult {
  couples: Record<string, CoupleLayout>;
  soloNodes: Record<string, SoloNodeLayout>;
  canvasWidth: number;
  canvasHeight: number;
}

export function computeTreeLayout(
  couples: LayoutCouple[],
  personCoupleMap: Record<string, string>, // nodeId -> coupleId (for children who have their own couple)
  constants: LayoutConstants,
): TreeLayoutResult {
  const { NODE_W, NODE_H, SPOUSE_GAP, SUBTREE_GAP, ROW_HEIGHT, PADDING } = constants;
  const COUPLE_W = NODE_W * 2 + SPOUSE_GAP;

  const coupleById: Record<string, LayoutCouple & { gen: number; subtreeWidth: number; cx: number }> = {};
  couples.forEach((c) => {
    coupleById[c.id] = { ...c, gen: -1, subtreeWidth: 0, cx: 0 };
  });

  // Phase 1: Generation assignment (BFS from root = couples[0])
  if (couples.length === 0) {
    return { couples: {}, soloNodes: {}, canvasWidth: 0, canvasHeight: 0 };
  }

  const root = coupleById[couples[0].id];
  root.gen = 0;
  const queue = [root];

  while (queue.length > 0) {
    const couple = queue.shift()!;
    for (const childId of couple.children) {
      const childCoupleId = personCoupleMap[childId];
      if (childCoupleId && coupleById[childCoupleId] && coupleById[childCoupleId].gen === -1) {
        coupleById[childCoupleId].gen = couple.gen + 1;
        queue.push(coupleById[childCoupleId]);
      }
    }
  }

  // Phase 2: Subtree widths (bottom-up)
  const maxGen = Math.max(...Object.values(coupleById).map((c) => c.gen).filter((g) => g >= 0));

  for (let gen = maxGen; gen >= 0; gen--) {
    const genCouples = Object.values(coupleById).filter((c) => c.gen === gen);

    for (const couple of genCouples) {
      const childCouples = couple.children
        .map((cid) => personCoupleMap[cid])
        .filter(Boolean)
        .map((cpId) => coupleById[cpId!])
        .filter(Boolean);

      const soloCount = couple.children.filter((cid) => !personCoupleMap[cid]).length;
      const soloWidth = soloCount > 0
        ? soloCount * NODE_W + (soloCount - 1) * SUBTREE_GAP
        : 0;

      if (childCouples.length === 0) {
        couple.subtreeWidth = Math.max(COUPLE_W, soloWidth || COUPLE_W);
      } else {
        const coupledWidth =
          childCouples.reduce((s, cc) => s + cc.subtreeWidth, 0) +
          (childCouples.length - 1) * SUBTREE_GAP;
        couple.subtreeWidth = Math.max(COUPLE_W, coupledWidth, soloWidth);
      }
    }
  }

  // Phase 3: X/Y positions (top-down BFS)
  root.cx = root.subtreeWidth / 2 + PADDING;
  const posQueue = [root];
  const soloNodes: Record<string, SoloNodeLayout> = {};

  while (posQueue.length > 0) {
    const couple = posQueue.shift()!;

    const childCouples = couple.children
      .map((cid) => personCoupleMap[cid])
      .filter(Boolean)
      .map((cpId) => coupleById[cpId!])
      .filter(Boolean);

    if (childCouples.length > 0) {
      const totalW =
        childCouples.reduce((s, cc) => s + cc.subtreeWidth, 0) +
        (childCouples.length - 1) * SUBTREE_GAP;
      let x = couple.cx - totalW / 2;
      for (const cc of childCouples) {
        cc.cx = x + cc.subtreeWidth / 2;
        x += cc.subtreeWidth + SUBTREE_GAP;
        posQueue.push(cc);
      }
    }

    // Position solo leaf children
    const soloIds = couple.children.filter((cid) => !personCoupleMap[cid]);
    if (soloIds.length > 0) {
      const totalW = soloIds.length * NODE_W + (soloIds.length - 1) * SUBTREE_GAP;
      let x = couple.cx - totalW / 2;
      for (const nodeId of soloIds) {
        soloNodes[nodeId] = {
          x,
          y: (couple.gen + 1) * ROW_HEIGHT + PADDING,
          cx: x + NODE_W / 2,
        };
        x += NODE_W + SUBTREE_GAP;
      }
    }
  }

  // Build result
  const coupleLayouts: Record<string, CoupleLayout> = {};
  for (const c of Object.values(coupleById)) {
    if (c.gen < 0) continue;
    coupleLayouts[c.id] = {
      gen: c.gen,
      subtreeWidth: c.subtreeWidth,
      cx: c.cx,
      y: c.gen * ROW_HEIGHT + PADDING,
      yBot: c.gen * ROW_HEIGHT + PADDING + NODE_H,
      spouseAX: c.cx - SPOUSE_GAP / 2 - NODE_W,
      spouseBX: c.cx + SPOUSE_GAP / 2,
    };
  }

  const hasSoloNodes = Object.keys(soloNodes).length > 0;
  const maxGenForHeight = hasSoloNodes ? maxGen + 1 : maxGen;

  return {
    couples: coupleLayouts,
    soloNodes,
    canvasWidth: root.subtreeWidth + PADDING * 2,
    canvasHeight: (maxGenForHeight + 1) * ROW_HEIGHT + PADDING * 2,
  };
}
