import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { WizardReviewComponent } from './wizard-review.component';
import { WizardStateService } from '../../services/wizard-state.service';
import type { WizardConfig } from '../../models/wizard.model';

const mockConfig: WizardConfig = {
  showAdminAssignment: false,
  selfNode: { name: 'Alice', gender: 'F' },
};

describe('WizardReviewComponent', () => {
  let fixture: ComponentFixture<WizardReviewComponent>;
  let state: WizardStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WizardReviewComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    state = new WizardStateService();
    state.initWithConfig(mockConfig);
    state.setCommunityName('Smith Family');

    fixture = TestBed.createComponent(WizardReviewComponent);
    fixture.componentRef.setInput('state', state);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display community name', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const nameEl: Element | null = fixture.nativeElement.querySelector('.community-name');
    expect(nameEl?.textContent).toContain('Smith Family');
  });

  it('should show node count in heading', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const content: string = fixture.nativeElement.textContent as string;
    expect(content).toContain('1');
  });

  it('should emit submit when submit-btn clicked', () => {
    let count = 0;
    fixture.componentInstance.submit.subscribe(() => count++);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.submit-btn');
    btn.click();

    expect(count).toBe(1);
  });

  it('should emit back when back-btn clicked', () => {
    let count = 0;
    fixture.componentInstance.back.subscribe(() => count++);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.back-btn');
    btn.click();

    expect(count).toBe(1);
  });

  it('should show "You" badge for self node', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const badge: Element | null = fixture.nativeElement.querySelector('.you-badge');
    expect(badge).not.toBeNull();
  });
});
