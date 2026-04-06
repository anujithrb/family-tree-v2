import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { RelationshipResult } from '@family-tree/shared-ui';

@Injectable({ providedIn: 'root' })
export class RelationshipApiService {
  private readonly http = inject(HttpClient);

  findRelationship(
    communityId: string,
    fromNodeId: string,
    toNodeId: string,
  ): Observable<RelationshipResult> {
    return this.http.get<RelationshipResult>(
      `/api/communities/${communityId}/relationship?from=${fromNodeId}&to=${toNodeId}`,
    );
  }
}
