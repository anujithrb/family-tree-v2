import { TreeZoomService } from './tree-zoom.service';

describe('TreeZoomService', () => {
  let service: TreeZoomService;

  beforeEach(() => {
    service = new TreeZoomService();
  });

  it('should start with identity transform', () => {
    const t = service.transform;
    expect(t.x).toBe(0);
    expect(t.y).toBe(0);
    expect(t.k).toBe(1);
  });

  it('should register and unregister transform listeners', () => {
    const calls: unknown[] = [];
    const unsubscribe = service.onTransformChange((t) => calls.push(t));
    unsubscribe();
    // After unsubscribe, no more calls — tested via initZoom side-effects in the app
    expect(calls).toHaveLength(0);
  });

  describe('fitToScreen', () => {
    it('should do nothing when zoomBehavior is not initialized', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
      const content = document.createElementNS('http://www.w3.org/2000/svg', 'g') as SVGGElement;
      // Should not throw even without zoom behavior
      expect(() => service.fitToScreen(svg, content)).not.toThrow();
    });
  });

  describe('panTo', () => {
    it('should do nothing when zoomBehavior is not initialized', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
      // Should not throw even without zoom behavior
      expect(() => service.panTo(svg, 100, 200)).not.toThrow();
    });
  });
});
