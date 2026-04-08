import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CommunityState } from './community.state';

describe('CommunityState', () => {
  let state: CommunityState;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    state = TestBed.inject(CommunityState);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should start with empty communities', () => {
    expect(state.communities()).toEqual([]);
    expect(state.active()).toBeNull();
  });

  it('should load communities and set first as active', () => {
    state.loadCommunities().subscribe();
    const req = httpMock.expectOne('/api/communities');
    req.flush([
      { id: 'c1', name: 'First', createdAt: '2026-01-01' },
      { id: 'c2', name: 'Second', createdAt: '2026-02-01' },
    ]);
    expect(state.communities()).toHaveLength(2);
    expect(state.active()?.id).toBe('c1');
  });

  it('should switch active community', () => {
    state.loadCommunities().subscribe();
    httpMock.expectOne('/api/communities').flush([
      { id: 'c1', name: 'First', createdAt: '2026-01-01' },
      { id: 'c2', name: 'Second', createdAt: '2026-02-01' },
    ]);

    state.setActive('c2');
    expect(state.active()?.id).toBe('c2');
  });
});
