import {
  Component,
  input,
  output,
  ElementRef,
  viewChild,
  afterNextRender,
  inject,
  OnDestroy,
} from '@angular/core';
import { TreeCanvasComponent } from '../tree-canvas/tree-canvas.component';
import { TreeZoomService } from '../../services/tree-zoom.service';
import type { TreeResponse, TreePerson } from '../../models/tree-data.model';

@Component({
  selector: 'ft-tree-viewer',
  standalone: true,
  imports: [TreeCanvasComponent],
  templateUrl: './tree-viewer.component.html',
  styleUrl: './tree-viewer.component.scss',
})
export class TreeViewerComponent implements OnDestroy {
  readonly treeData = input.required<TreeResponse>();
  readonly selectedNodeId = input<string | null>(null);

  readonly nodeSelected = output<TreePerson>();
  readonly emptyClicked = output();

  private readonly svgRef = viewChild<ElementRef<SVGSVGElement>>('svgElement');
  private readonly contentRef = viewChild<ElementRef<SVGGElement>>('contentElement');
  readonly zoomService = inject(TreeZoomService);

  constructor() {
    afterNextRender(() => {
      const svg = this.svgRef()?.nativeElement;
      const content = this.contentRef()?.nativeElement;
      if (svg && content) {
        this.zoomService.initZoom(svg, content);
      }
    });
  }

  ngOnDestroy(): void {
    const svg = this.svgRef()?.nativeElement;
    if (svg) {
      this.zoomService.resetZoom(svg);
    }
  }

  onNodeSelected(person: TreePerson): void {
    this.nodeSelected.emit(person);
  }

  onSvgClick(event: MouseEvent): void {
    const target = event.target as Element;
    if (target.tagName === 'svg' || target.classList.contains('tree-bg')) {
      this.emptyClicked.emit();
    }
  }

  zoomIn(): void {
    const svg = this.svgRef()?.nativeElement;
    if (svg) this.zoomService.zoomIn(svg);
  }

  zoomOut(): void {
    const svg = this.svgRef()?.nativeElement;
    if (svg) this.zoomService.zoomOut(svg);
  }

  fitToScreen(): void {
    const svg = this.svgRef()?.nativeElement;
    if (svg) this.zoomService.resetZoom(svg);
  }
}
