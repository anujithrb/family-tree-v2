import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RelationshipApiService } from '../../core/api/relationship-api.service';
import { TreeState } from '../../core/state/tree.state';
import type { RelationshipResult, TreePerson } from '@family-tree/shared-ui';

@Component({
  selector: 'ft-relationship',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './relationship.component.html',
  styleUrl: './relationship.component.scss',
})
export class RelationshipComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly relationshipApi = inject(RelationshipApiService);
  readonly treeState = inject(TreeState);

  readonly fromNode = signal<TreePerson | null>(null);
  readonly toNode = signal<TreePerson | null>(null);
  readonly result = signal<RelationshipResult | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private get communityId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  ngOnInit(): void {
    if (!this.treeState.treeData()) {
      this.treeState.loadTree(this.communityId);
    }
  }

  selectFrom(person: TreePerson): void {
    this.fromNode.set(person);
    this.result.set(null);
  }

  selectTo(person: TreePerson): void {
    this.toNode.set(person);
    this.result.set(null);
  }

  selectFromByIndex(index: string): void {
    const people = this.treeState.treeData()?.people ?? [];
    const idx = Number(index);
    if (idx >= 0 && idx < people.length) this.selectFrom(people[idx]);
  }

  selectToByIndex(index: string): void {
    const people = this.treeState.treeData()?.people ?? [];
    const idx = Number(index);
    if (idx >= 0 && idx < people.length) this.selectTo(people[idx]);
  }

  findRelationship(): void {
    const from = this.fromNode();
    const to = this.toNode();
    if (!from || !to) return;
    this.loading.set(true);
    this.error.set(null);
    this.relationshipApi.findRelationship(this.communityId, from.nodeId, to.nodeId).subscribe({
      next: (res) => {
        this.result.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not find relationship');
        this.loading.set(false);
      },
    });
  }
}
