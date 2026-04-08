import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { PanelContentComponent } from './panel-content.component';
import type { TreePerson } from '../../../tree-viewer/models/tree-data.model';

const mockPerson: TreePerson = {
  nodeId: 'node-1',
  personId: 'person-1',
  profileId: 'profile-1',
  name: 'Alice Smith',
  birthYear: 1980,
  deathYear: null,
  isDeceased: false,
  gender: 'female',
  profilePhoto: null,
  isRegisteredUser: false,
};

describe('PanelContentComponent', () => {
  let fixture: ComponentFixture<PanelContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelContentComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(PanelContentComponent);
    fixture.componentRef.setInput('person', mockPerson);
    fixture.componentRef.setInput('mode', 'person-detail');
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display person name in view mode', () => {
    fixture.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const nameEl: Element = fixture.nativeElement.querySelector('.person-name');
    expect(nameEl.textContent).toContain('Alice Smith');
  });

  it('should show birth year in view mode', () => {
    fixture.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const content: string = fixture.nativeElement.textContent as string;
    expect(content).toContain('1980');
  });

  it('should show edit button when user is admin', () => {
    fixture.componentRef.setInput('isAdmin', true);
    fixture.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const editBtn: Element | null = fixture.nativeElement.querySelector('[data-action="edit"]');
    expect(editBtn).not.toBeNull();
  });

  it('should NOT show edit button when not admin', () => {
    fixture.componentRef.setInput('isAdmin', false);
    fixture.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const editBtn: Element | null = fixture.nativeElement.querySelector('[data-action="edit"]');
    expect(editBtn).toBeNull();
  });

  it('should emit modeChange when edit is clicked', () => {
    fixture.componentRef.setInput('isAdmin', true);
    fixture.detectChanges();

    const emitted: string[] = [];
    fixture.componentInstance.modeChange.subscribe((v: string) => emitted.push(v));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const editBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-action="edit"]');
    editBtn.click();

    expect(emitted).toEqual(['person-edit']);
  });

  it('should show form in edit mode', () => {
    fixture.componentRef.setInput('mode', 'person-edit');
    fixture.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const form: Element | null = fixture.nativeElement.querySelector('form');
    expect(form).not.toBeNull();
  });

  it('should emit formSubmit with updated data', () => {
    fixture.componentRef.setInput('mode', 'person-edit');
    fixture.detectChanges();

    const emitted: Array<Record<string, unknown>> = [];
    fixture.componentInstance.formSubmit.subscribe((v: Record<string, unknown>) => emitted.push(v));

    // Set name via the signal (simulating user input)
    fixture.componentInstance.formName.set('Bob Jones');
    fixture.detectChanges();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));

    expect(emitted.length).toBe(1);
    expect(emitted[0]['name']).toBe('Bob Jones');
  });
});
