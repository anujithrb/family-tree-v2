import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { TreeResponse } from '@family-tree/shared-ui';

interface AddPersonRequest {
  name: string;
  gender?: string;
  birthYear?: number;
  deathYear?: number;
  isDeceased?: boolean;
}

interface AddCoupleRequest {
  personAId: string;
  personBId: string;
  status?: string;
  marriageDate?: string;
}

interface AddChildRequest {
  coupleId: string;
  childId: string;
}

interface UpdatePersonRequest {
  name?: string;
  gender?: string;
  birthYear?: number | null;
  deathYear?: number | null;
  isDeceased?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TreeApiService {
  private readonly http = inject(HttpClient);

  getTree(communityId: string): Observable<TreeResponse> {
    return this.http.get<TreeResponse>(`/api/communities/${communityId}/tree`);
  }

  addPerson(communityId: string, data: AddPersonRequest): Observable<TreeResponse> {
    return this.http.post<TreeResponse>(`/api/communities/${communityId}/tree/nodes`, data);
  }

  addCouple(communityId: string, data: AddCoupleRequest): Observable<TreeResponse> {
    return this.http.post<TreeResponse>(`/api/communities/${communityId}/tree/couples`, data);
  }

  addChild(communityId: string, data: AddChildRequest): Observable<TreeResponse> {
    return this.http.post<TreeResponse>(`/api/communities/${communityId}/tree/children`, data);
  }

  updatePerson(
    communityId: string,
    nodeId: string,
    data: UpdatePersonRequest,
  ): Observable<TreeResponse> {
    return this.http.patch<TreeResponse>(
      `/api/communities/${communityId}/tree/nodes/${nodeId}`,
      data,
    );
  }

  deletePerson(communityId: string, nodeId: string): Observable<TreeResponse> {
    return this.http.delete<TreeResponse>(`/api/communities/${communityId}/tree/nodes/${nodeId}`);
  }
}
