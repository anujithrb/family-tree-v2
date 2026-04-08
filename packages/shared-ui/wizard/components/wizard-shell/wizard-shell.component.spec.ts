import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { WizardShellComponent } from './wizard-shell.component';
import type { WizardConfig } from '../../models/wizard.model';

const mockConfig: WizardConfig = {
  showAdminAssignment: false,
  selfNode: { name: 'Test User', gender: 'M' },
};

describe('WizardShellComponent', () => {
  let fixture: ComponentFixture<WizardShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WizardShellComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(WizardShellComponent);
    fixture.componentRef.setInput('config', mockConfig);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show step 1 content with Community Name heading', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const heading: Element | null = fixture.nativeElement.querySelector('h2');
    expect(heading?.textContent).toContain('Community Name');
  });

  it('should render step indicator with 3 spans', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const spans: NodeList = fixture.nativeElement.querySelectorAll('.step-indicator span');
    expect(spans.length).toBe(3);
  });
});
