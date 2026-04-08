import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { WizardNodeActionsComponent } from './wizard-node-actions.component';
import type { TempNode } from '../../models/wizard.model';

const mockNode: TempNode = {
  tempId: 'node-1',
  name: 'Alice',
  gender: 'F',
};

describe('WizardNodeActionsComponent', () => {
  let fixture: ComponentFixture<WizardNodeActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WizardNodeActionsComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(WizardNodeActionsComponent);
    fixture.componentRef.setInput('node', mockNode);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should emit addSpouse when add-spouse button clicked', () => {
    let count = 0;
    fixture.componentInstance.addSpouse.subscribe(() => count++);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-action="add-spouse"]',
    );
    btn.click();

    expect(count).toBe(1);
  });

  it('should emit remove when remove button clicked', () => {
    let count = 0;
    fixture.componentInstance.remove.subscribe(() => count++);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-action="remove"]');
    btn.click();

    expect(count).toBe(1);
  });

  it('should not show add-spouse button when canAddSpouse is false', async () => {
    fixture.componentRef.setInput('canAddSpouse', false);
    await fixture.whenStable();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const btn: Element | null = fixture.nativeElement.querySelector('[data-action="add-spouse"]');
    expect(btn).toBeNull();
  });
});
