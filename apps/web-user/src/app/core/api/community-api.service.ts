import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Community, CommunityDetail } from '@family-tree/shared-ui';
import type { TempNode, TempCouple, TempChild } from '@family-tree/shared-ui';

interface CreateCommunityRequest {
  name: string;
}

interface CreateCommunityWithTreeRequest {
  name: string;
  nodes: TempNode[];
  couples: TempCouple[];
  children: TempChild[];
}

@Injectable({ providedIn: 'root' })
export class CommunityApiService {
  private readonly http = inject(HttpClient);

  getMyCommunities(): Observable<Community[]> {
    return this.http.get<Community[]>('/api/communities');
  }

  getCommunity(id: string): Observable<CommunityDetail> {
    return this.http.get<CommunityDetail>(`/api/communities/${id}`);
  }

  createCommunity(data: CreateCommunityRequest): Observable<Community> {
    return this.http.post<Community>('/api/communities', data);
  }

  createCommunityWithTree(data: CreateCommunityWithTreeRequest): Observable<Community> {
    return this.http.post<Community>('/api/communities/with-tree', data);
  }

  joinCommunity(code: string): Observable<Community> {
    return this.http.post<Community>('/api/communities/join', { code });
  }
}
