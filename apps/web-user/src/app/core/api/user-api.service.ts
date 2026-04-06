import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { UserProfile } from '@family-tree/shared-ui';

interface UpdateProfileRequest {
  displayName?: string;
}

@Injectable({ providedIn: 'root' })
export class UserApiService {
  private readonly http = inject(HttpClient);

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>('/api/users/me');
  }

  updateProfile(data: UpdateProfileRequest): Observable<UserProfile> {
    return this.http.patch<UserProfile>('/api/users/me', data);
  }

  uploadProfilePhoto(file: File): Observable<UserProfile> {
    const formData = new FormData();
    formData.append('photo', file);
    return this.http.post<UserProfile>('/api/users/me/photo', formData);
  }
}
