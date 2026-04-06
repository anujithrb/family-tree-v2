export interface LayoutConstants {
  nodeWidth: number;
  nodeHeight: number;
  spouseGap: number;
  subtreeGap: number;
  rowHeight: number;
  padding: number;
}

export const DEFAULT_LAYOUT_CONSTANTS: LayoutConstants = {
  nodeWidth: 120,
  nodeHeight: 60,
  spouseGap: 12,
  subtreeGap: 48,
  rowHeight: 120,
  padding: 40,
};

export interface LayoutCouple {
  id: string;
  spouseAId: string;
  spouseBId: string;
  children: string[];
}

export interface CoupleLayout {
  gen: number;
  subtreeWidth: number;
  cx: number;
  y: number;
  yBot: number;
  spouseAX: number;
  spouseBX: number;
}

export interface SoloNodeLayout {
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
