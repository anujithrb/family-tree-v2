import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CommunityApiService } from './community-api.service';

describe('CommunityApiService', () => {
  let service: CommunityApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        CommunityApiService,
      ],
    });
    service = TestBed.inject(CommunityApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should get communities', () => {
    service.getMyCommunities().subscribe((res) => {
      expect(res).toHaveLength(1);
    });
    httpMock.expectOne('/api/communities').flush([{ id: 'c1', name: 'Test', createdAt: '' }]);
  });

  it('should create a community', () => {
    service.createCommunity({ name: 'New' }).subscribe();
    const req = httpMock.expectOne('/api/communities');
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'c2', name: 'New', createdAt: '' });
  });
});
