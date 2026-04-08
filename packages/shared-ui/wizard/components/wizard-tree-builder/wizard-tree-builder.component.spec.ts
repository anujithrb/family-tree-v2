import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { WizardTreeBuilderComponent } from './wizard-tree-builder.component';
import { WizardStateService } from '../../services/wizard-state.service';
import type { WizardConfig } from '../../models/wizard.model';

const mockConfig: WizardConfig = {
  showAdminAssignment: false,
  selfNode: { name: 'Alice', gender: 'F' },
};

describe('WizardTreeBuilderComponent', () => {
  let fixture: ComponentFixture<WizardTreeBuilderComponent>;
  let state: WizardStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WizardTreeBuilderComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    state = new WizardStateService();
    state.initWithConfig(mockConfig);

    fixture = TestBed.createComponent(WizardTreeBuilderComponent);
    fixture.componentRef.setInput('state', state);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render nodes', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const cards: NodeList = fixture.nativeElement.querySelectorAll('.node-card');
    expect(cards.length).toBe(1);
  });

  it('should show "(You)" label for self node', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const badge: Element | null = fixture.nativeElement.querySelector('.you-badge');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('You');
  });

  it('should show node actions when a node is clicked', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const card: HTMLElement = fixture.nativeElement.querySelector('.node-card');
    card.click();
    await fixture.whenStable();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const actions: Element | null = fixture.nativeElement.querySelector('ft-wizard-node-actions');
    expect(actions).not.toBeNull();
  });

  it('should deselect node when clicked again', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const card: HTMLElement = fixture.nativeElement.querySelector('.node-card');
    card.click();
    await fixture.whenStable();
    card.click();
    await fixture.whenStable();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const actions: Element | null = fixture.nativeElement.querySelector('ft-wizard-node-actions');
    expect(actions).toBeNull();
  });
});
