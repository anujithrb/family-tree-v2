export interface ZoomTransform {
  x: number;
  y: number;
  k: number;
}

export class TreeZoomService {
  private _transform: ZoomTransform = { x: 0, y: 0, k: 1 };
  private listeners: Array<(t: ZoomTransform) => void> = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private zoomBehavior: any = null;

  get transform(): ZoomTransform {
    return this._transform;
  }

  onTransformChange(fn: (t: ZoomTransform) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify(): void {
    for (const fn of this.listeners) {
      fn(this._transform);
    }
  }

  initZoom(svgElement: SVGSVGElement, contentElement: SVGGElement): void {
    void Promise.all([
      import(/* @vite-ignore */ 'd3-zoom'),
      import(/* @vite-ignore */ 'd3-selection'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ]).then(([d3zoom, d3sel]: [any, any]) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const z = d3zoom
        .zoom()
        .scaleExtent([0.1, 3])
        .on(
          'zoom',
          (event: { transform: { x: number; y: number; k: number; toString(): string } }) => {
            const { x, y, k } = event.transform;
            this._transform = { x, y, k };
            this.notify();
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            d3sel.select(contentElement).attr('transform', event.transform.toString());
          },
        );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      this.zoomBehavior = z;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      d3sel.select(svgElement).call(z);
    });
  }

  resetZoom(svgElement: SVGSVGElement): void {
    if (!this.zoomBehavior) return;
    void Promise.all([
      import(/* @vite-ignore */ 'd3-zoom'),
      import(/* @vite-ignore */ 'd3-selection'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ]).then(([d3zoom, d3sel]: [any, any]) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      d3sel.select(svgElement).call(this.zoomBehavior.transform, d3zoom.zoomIdentity);
    });
  }
}
