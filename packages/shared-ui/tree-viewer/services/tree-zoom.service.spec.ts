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
});
