import { Component, computed, input, output } from '@angular/core';
import type { TreeResponse, TreePerson } from '../../models/tree-data.model';
import { TreeLayoutService } from '../../services/tree-layout.service';
import { DEFAULT_LAYOUT_CONSTANTS } from '../../models/tree-layout.model';
import { PersonCardComponent } from '../person-card/person-card.component';
import { TreeConnectorComponent } from '../tree-connector/tree-connector.component';

@Component({
  selector: 'ft-tree-canvas',
  standalone: true,
  imports: [PersonCardComponent, TreeConnectorComponent],
  template: `
    @for (entry of coupleEntries(); track entry.coupleId) {
      <ft-tree-connector
        [spouseAX]="entry.spouseAX"
        [spouseBX]="entry.spouseBX"
        [coupleY]="entry.coupleY"
        [coupleCx]="entry.coupleCx"
        [nodeWidth]="c.nodeWidth"
        [nodeHeight]="c.nodeHeight"
        [hasChildren]="entry.hasChildren"
        [dropLength]="entry.dropLength"
      />
      @if (entry.spouseA) {
        <ft-person-card
          [person]="entry.spouseA"
          [x]="entry.spouseAX"
          [y]="entry.coupleY"
          [width]="c.nodeWidth"
          [height]="c.nodeHeight"
          (cardClick)="onPersonSelected($event)"
        />
      }
      @if (entry.spouseB) {
        <ft-person-card
          [person]="entry.spouseB"
          [x]="entry.spouseBX"
          [y]="entry.coupleY"
          [width]="c.nodeWidth"
          [height]="c.nodeHeight"
          (cardClick)="onPersonSelected($event)"
        />
      }
    }
    @for (entry of soloEntries(); track entry.nodeId) {
      @if (entry.person) {
        <ft-person-card
          [person]="entry.person"
          [x]="entry.x"
          [y]="entry.y"
          [width]="c.nodeWidth"
          [height]="c.nodeHeight"
          (cardClick)="onPersonSelected($event)"
        />
      }
    }
  `,
})
export class TreeCanvasComponent {
  readonly treeData = input.required<TreeResponse>();
  readonly selectedNodeId = input<string | null>(null);

  readonly nodeSelected = output<TreePerson>();

  readonly c = DEFAULT_LAYOUT_CONSTANTS;

  private readonly layoutService = new TreeLayoutService();

  readonly personMap = computed<Record<string, TreePerson>>(() => {
    const map: Record<string, TreePerson> = {};
    for (const p of this.treeData().people) {
      map[p.nodeId] = p;
    }
    return map;
  });

  readonly layout = computed(() => {
    const data = this.treeData();
    const layoutCouples = data.couples.map((couple) => ({
      id: couple.id,
      spouseAId: couple.spouseAId,
      spouseBId: couple.spouseBId,
      children: couple.children,
    }));

    // Build personCoupleMap: nodeId -> coupleId (the couple the person is a SPOUSE in)
    const personCoupleMap: Record<string, string> = {};
    for (const couple of data.couples) {
      personCoupleMap[couple.spouseAId] = couple.id;
      personCoupleMap[couple.spouseBId] = couple.id;
    }

    return this.layoutService.computeLayout(layoutCouples, personCoupleMap);
  });

  readonly coupleEntries = computed(() => {
    const layout = this.layout();
    const pMap = this.personMap();
    const data = this.treeData();
    const coupleById = new Map(data.couples.map((c) => [c.id, c]));
    const dropLength = this.c.rowHeight - this.c.nodeHeight / 2;

    return Object.entries(layout.couples).map(([coupleId, cl]) => {
      const couple = coupleById.get(coupleId);
      return {
        coupleId,
        spouseA: couple ? (pMap[couple.spouseAId] ?? null) : null,
        spouseB: couple ? (pMap[couple.spouseBId] ?? null) : null,
        spouseAX: cl.spouseAX,
        spouseBX: cl.spouseBX,
        coupleY: cl.y,
        coupleCx: cl.cx,
        hasChildren: (couple?.children.length ?? 0) > 0,
        dropLength,
      };
    });
  });

  readonly soloEntries = computed(() => {
    const layout = this.layout();
    const pMap = this.personMap();

    return Object.entries(layout.soloNodes).map(([nodeId, pos]) => ({
      nodeId,
      person: pMap[nodeId] ?? null,
      x: pos.x,
      y: pos.y,
    }));
  });

  onPersonSelected(person: TreePerson): void {
    this.nodeSelected.emit(person);
  }
}
