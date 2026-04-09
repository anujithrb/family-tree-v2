import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProfileComponent } from './profile.component';
import { AuthService } from '../../core/auth/auth.service';
import type { UserProfile } from '@family-tree/shared-ui';

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;

  const mockUser = signal<UserProfile | null>(null);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: { user: mockUser, loadProfile: () => ({ pipe: () => ({ subscribe: () => {} }) }) },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProfileComponent);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should initialize displayName as empty when user is null', () => {
    mockUser.set(null);
    expect(fixture.componentInstance.displayName()).toBe('');
  });

  it('should reactively update displayName when auth.user() changes', async () => {
    mockUser.set({
      id: 'u1',
      email: 'test@example.com',
      displayName: 'Alice',
      profilePhoto: null,
      status: 'active',
      person: null,
    });
    await fixture.whenStable();
    expect(fixture.componentInstance.displayName()).toBe('Alice');
  });
});
