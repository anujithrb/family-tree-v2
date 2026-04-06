import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { PersonCardComponent } from './person-card.component';
import type { TreePerson } from '../../models/tree-data.model';

const mockPerson: TreePerson = {
  nodeId: 'n1',
  personId: 'p1',
  profileId: 'pr1',
  name: 'Alice',
  birthYear: 1980,
  deathYear: null,
  isDeceased: false,
  gender: 'FEMALE',
  profilePhoto: null,
  isRegisteredUser: false,
};

describe('PersonCardComponent', () => {
  let fixture: ComponentFixture<PersonCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonCardComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(PersonCardComponent);
    fixture.componentRef.setInput('person', mockPerson);
    fixture.detectChanges();
  });

  it('should display person name', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const text: Element | null = fixture.nativeElement.querySelector('.person-name');
    expect((text?.textContent ?? '').trim()).toBe('Alice');
  });

  it('should emit cardClick on click', () => {
    let clicked: TreePerson | undefined;
    fixture.componentInstance.cardClick.subscribe((p) => (clicked = p));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    fixture.nativeElement.querySelector('.person-card').click();
    expect(clicked).toEqual(mockPerson);
  });
});
