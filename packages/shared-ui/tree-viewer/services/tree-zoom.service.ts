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
      // @ts-expect-error - d3-zoom is loaded dynamically at runtime
      import(/* @vite-ignore */ 'd3-zoom'),
      // @ts-expect-error - d3-selection is loaded dynamically at runtime
      import(/* @vite-ignore */ 'd3-selection'),
    ]).then(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ([d3zoom, d3sel]: [any, any]) => {
        /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
        const z = d3zoom
          .zoom()
          .scaleExtent([0.1, 3])
          .on(
            'zoom',
            (event: { transform: { x: number; y: number; k: number; toString(): string } }) => {
              const { x, y, k } = event.transform;
              this._transform = { x, y, k };
              this.notify();
              d3sel.select(contentElement).attr('transform', event.transform.toString());
            },
          );

        this.zoomBehavior = z;
        d3sel.select(svgElement).call(z);
        /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
      },
    );
  }

  resetZoom(svgElement: SVGSVGElement): void {
    if (!this.zoomBehavior) return;

    void Promise.all([
      // @ts-expect-error - d3-zoom is loaded dynamically at runtime
      import(/* @vite-ignore */ 'd3-zoom'),
      // @ts-expect-error - d3-selection is loaded dynamically at runtime
      import(/* @vite-ignore */ 'd3-selection'),
    ]).then(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ([d3zoom, d3sel]: [any, any]) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        d3sel.select(svgElement).call(this.zoomBehavior.transform, d3zoom.zoomIdentity);
      },
    );
  }

  zoomIn(svgElement: SVGSVGElement): void {
    if (!this.zoomBehavior) return;
    const { x, y, k } = this._transform;
    this._applyTransform(svgElement, x, y, Math.min(k * 1.25, 3));
  }

  zoomOut(svgElement: SVGSVGElement): void {
    if (!this.zoomBehavior) return;
    const { x, y, k } = this._transform;
    this._applyTransform(svgElement, x, y, Math.max(k * 0.8, 0.1));
  }

  private _applyTransform(svgElement: SVGSVGElement, x: number, y: number, k: number): void {
    void Promise.all([
      // @ts-expect-error - d3-zoom is loaded dynamically at runtime
      import(/* @vite-ignore */ 'd3-zoom'),
      // @ts-expect-error - d3-selection is loaded dynamically at runtime
      import(/* @vite-ignore */ 'd3-selection'),
    ]).then(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ([d3zoom, d3sel]: [any, any]) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        const newTransform = d3zoom.zoomIdentity.translate(x, y).scale(k);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        d3sel.select(svgElement).call(this.zoomBehavior.transform, newTransform);
      },
    );
  }
}
