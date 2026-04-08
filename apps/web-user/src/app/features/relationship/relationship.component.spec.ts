import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RelationshipComponent } from './relationship.component';

describe('RelationshipComponent', () => {
  let fixture: ComponentFixture<RelationshipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelationshipComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'community-1' } } },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(RelationshipComponent);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
