import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { WizardStepNameComponent } from './wizard-step-name.component';

describe('WizardStepNameComponent', () => {
  let fixture: ComponentFixture<WizardStepNameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WizardStepNameComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(WizardStepNameComponent);
    fixture.componentRef.setInput('name', '');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show Community Name heading', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const h2: Element | null = fixture.nativeElement.querySelector('h2');
    expect(h2?.textContent).toContain('Community Name');
  });

  it('should disable Next button when name is empty', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    expect(btn.disabled).toBeTrue();
  });

  it('should enable Next button when name has content', async () => {
    fixture.componentRef.setInput('name', 'Smith Family');
    await fixture.whenStable();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    expect(btn.disabled).toBeFalse();
  });

  it('should emit nameChange when input changes', async () => {
    const emitted: string[] = [];
    fixture.componentInstance.nameChange.subscribe((v: string) => emitted.push(v));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="text"]');

    input.value = 'Jones Family';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(emitted).toEqual(['Jones Family']);
  });

  it('should emit next when form submitted with non-empty name', async () => {
    fixture.componentRef.setInput('name', 'Smith Family');
    await fixture.whenStable();

    let count = 0;
    fixture.componentInstance.next.subscribe(() => count++);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(count).toBe(1);
  });
});
