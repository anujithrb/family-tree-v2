import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
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
export class TreePageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  readonly treeState = inject(TreeState);
  private readonly treeApi = inject(TreeApiService);

  readonly panelMode = signal<PanelView>('person-detail');
  readonly bottomSheetState = signal<BottomSheetState>('hidden');
  readonly sidePanelOpen = signal(false);
  readonly mutationError = signal<string | null>(null);

  private readonly communityId = signal('');
  private paramSub?: Subscription;

  ngOnInit(): void {
    this.paramSub = this.route.paramMap.subscribe((params) => {
      const id = params.get('id') ?? '';
      this.communityId.set(id);
      this.treeState.loadTree(id);
    });
  }

  ngOnDestroy(): void {
    this.paramSub?.unsubscribe();
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
    const communityId = this.communityId();
    this.mutationError.set(null);

    if (action === 'edit') {
      this.treeApi
        .updatePerson(communityId, data['nodeId'] as string, {
          name: data['name'] as string,
          gender: data['gender'] as string | undefined,
          birthYear: data['birthYear'] as number | null,
          deathYear: data['deathYear'] as number | null,
          isDeceased: data['isDeceased'] as boolean,
        })
        .subscribe({
          next: () => {
            this.treeState.loadTree(communityId);
            this.onPanelClosed();
          },
          error: () => {
            this.mutationError.set('Failed to update person. Please try again.');
          },
        });
    } else if (action === 'add-person') {
      this.treeApi
        .addPerson(communityId, {
          name: data['name'] as string,
          gender: data['gender'] as string | undefined,
          birthYear: data['birthYear'] as number | undefined,
        })
        .subscribe({
          next: () => {
            this.treeState.loadTree(communityId);
            this.onPanelClosed();
          },
          error: () => {
            this.mutationError.set('Failed to add person. Please try again.');
          },
        });
    }
  }

  onDeleteRequested(): void {
    const node = this.treeState.selectedNode();
    if (!node) return;
    const communityId = this.communityId();
    this.mutationError.set(null);
    this.treeApi.deletePerson(communityId, node.nodeId).subscribe({
      next: () => {
        this.treeState.loadTree(communityId);
        this.onPanelClosed();
      },
      error: () => {
        this.mutationError.set('Failed to delete person. Please try again.');
      },
    });
  }

  onPersonNavigate(nodeId: string): void {
    const data = this.treeState.treeData();
    if (!data) return;
    const person = data.people.find((p) => p.nodeId === nodeId);
    if (person) this.onNodeSelected(person);
  }
}
