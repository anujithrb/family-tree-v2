import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TreeApiService } from './tree-api.service';

describe('TreeApiService', () => {
  let service: TreeApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        TreeApiService,
      ],
    });
    service = TestBed.inject(TreeApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should get tree', () => {
    service.getTree('c1').subscribe();
    const req = httpMock.expectOne('/api/communities/c1/tree');
    expect(req.request.method).toBe('GET');
    req.flush({ communityId: 'c1', communityName: 'Test', people: [], couples: [] });
  });

  it('should add person', () => {
    service.addPerson('c1', { name: 'Alice' }).subscribe();
    const req = httpMock.expectOne('/api/communities/c1/tree/nodes');
    expect(req.request.method).toBe('POST');
    req.flush({ communityId: 'c1', communityName: 'Test', people: [], couples: [] });
  });
});
