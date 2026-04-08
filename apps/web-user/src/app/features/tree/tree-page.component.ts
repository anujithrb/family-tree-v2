import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  TreeViewerComponent,
  SidePanelComponent,
  BottomSheetComponent,
  PanelContentComponent,
  type TreePerson,
  type PanelView,
  type BottomSheetState,
} from '@family-tree/shared-ui';
import { TreeState } from '../../core/state/tree.state';
import { TreeApiService } from '../../core/api/tree-api.service';

@Component({
  selector: 'ft-tree-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TreeViewerComponent, SidePanelComponent, BottomSheetComponent, PanelContentComponent],
  templateUrl: './tree-page.component.html',
  styleUrl: './tree-page.component.scss',
})
export class TreePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly treeState = inject(TreeState);
  private readonly treeApi = inject(TreeApiService);

  readonly panelMode = signal<PanelView>('person-detail');
  readonly bottomSheetState = signal<BottomSheetState>('hidden');
  readonly sidePanelOpen = signal(false);

  private get communityId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  ngOnInit(): void {
    this.treeState.loadTree(this.communityId);
  }

  onNodeSelected(person: TreePerson): void {
    this.treeState.selectNode(person);
    this.panelMode.set('person-detail');
    this.sidePanelOpen.set(true);
    this.bottomSheetState.set('peek');
  }

  onPanelClosed(): void {
    this.treeState.clearSelection();
    this.sidePanelOpen.set(false);
    this.bottomSheetState.set('hidden');
  }

  onModeChange(mode: PanelView): void {
    this.panelMode.set(mode);
  }

  onFormSubmit(data: Record<string, unknown>): void {
    const action = data['action'] as string;
    const communityId = this.communityId;

    if (action === 'edit') {
      this.treeApi
        .updatePerson(communityId, data['nodeId'] as string, {
          name: data['name'] as string,
          gender: data['gender'] as string | undefined,
          birthYear: data['birthYear'] as number | null,
          deathYear: data['deathYear'] as number | null,
          isDeceased: data['isDeceased'] as boolean,
        })
        .subscribe(() => {
          this.treeState.loadTree(communityId);
          this.onPanelClosed();
        });
    } else if (action === 'add-person') {
      this.treeApi
        .addPerson(communityId, {
          name: data['name'] as string,
          gender: data['gender'] as string | undefined,
          birthYear: data['birthYear'] as number | undefined,
        })
        .subscribe(() => {
          this.treeState.loadTree(communityId);
          this.onPanelClosed();
        });
    }
  }

  onDeleteRequested(): void {
    const node = this.treeState.selectedNode();
    if (!node) return;
    this.treeApi.deletePerson(this.communityId, node.nodeId).subscribe(() => {
      this.treeState.loadTree(this.communityId);
      this.onPanelClosed();
    });
  }

  onPersonNavigate(nodeId: string): void {
    const data = this.treeState.treeData();
    if (!data) return;
    const person = data.people.find((p) => p.nodeId === nodeId);
    if (person) this.onNodeSelected(person);
  }
}
