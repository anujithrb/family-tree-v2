import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RelationshipApiService } from './relationship-api.service';

describe('RelationshipApiService', () => {
  let service: RelationshipApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        RelationshipApiService,
      ],
    });
    service = TestBed.inject(RelationshipApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should find relationship', () => {
    service.findRelationship('c1', 'n1', 'n2').subscribe();
    const req = httpMock.expectOne('/api/communities/c1/relationship?from=n1&to=n2');
    expect(req.request.method).toBe('GET');
    req.flush({ path: ['n1', 'n2'] });
  });
});
