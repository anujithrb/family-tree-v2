import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CommunitySwitcherComponent } from './community-switcher.component';

describe('CommunitySwitcherComponent', () => {
  let fixture: ComponentFixture<CommunitySwitcherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunitySwitcherComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CommunitySwitcherComponent);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should toggle dropdown on click', () => {
    fixture.componentInstance.toggle();
    expect(fixture.componentInstance.isOpen()).toBe(true);
    fixture.componentInstance.toggle();
    expect(fixture.componentInstance.isOpen()).toBe(false);
  });
});
