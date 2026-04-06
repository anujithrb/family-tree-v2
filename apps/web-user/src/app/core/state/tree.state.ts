import { Injectable, inject, signal } from '@angular/core';
import { TreeApiService } from '../api/tree-api.service';
import type { TreeResponse, TreePerson } from '@family-tree/shared-ui';

@Injectable({ providedIn: 'root' })
export class TreeState {
  private readonly treeApi = inject(TreeApiService);

  readonly treeData = signal<TreeResponse | null>(null);
  readonly selectedNode = signal<TreePerson | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  loadTree(communityId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.treeApi.getTree(communityId).subscribe({
      next: (data) => {
        this.treeData.set(data);
        this.loading.set(false);
        // Preserve selection if same person still exists
        const current = this.selectedNode();
        if (current) {
          const stillExists = data.people.find((p) => p.nodeId === current.nodeId);
          if (stillExists) {
            this.selectedNode.set(stillExists);
          } else {
            this.selectedNode.set(null);
          }
        }
      },
      error: (err: unknown) => {
        const errorMsg =
          typeof err === 'object' && err !== null && 'error' in err
            ? ((err as { error?: { error?: string } }).error?.error ?? 'Failed to load tree')
            : 'Failed to load tree';
        this.error.set(errorMsg);
        this.loading.set(false);
      },
    });
  }

  selectNode(person: TreePerson): void {
    this.selectedNode.set(person);
  }

  clearSelection(): void {
    this.selectedNode.set(null);
  }
}
