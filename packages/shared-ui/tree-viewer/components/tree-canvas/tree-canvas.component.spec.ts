import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TreeCanvasComponent } from './tree-canvas.component';
import type { TreeResponse } from '../../models/tree-data.model';

describe('TreeCanvasComponent', () => {
  let fixture: ComponentFixture<TreeCanvasComponent>;
  let component: TreeCanvasComponent;

  const mockTree: TreeResponse = {
    communityId: 'c1',
    communityName: 'Test',
    people: [
      {
        nodeId: 'nA',
        personId: 'pA',
        profileId: 'father',
        name: 'Father',
        birthYear: 1960,
        deathYear: null,
        isDeceased: false,
        gender: 'M',
        profilePhoto: null,
        isRegisteredUser: false,
      },
      {
        nodeId: 'nB',
        personId: 'pB',
        profileId: 'mother',
        name: 'Mother',
        birthYear: 1962,
        deathYear: null,
        isDeceased: false,
        gender: 'F',
        profilePhoto: null,
        isRegisteredUser: false,
      },
      {
        nodeId: 'nC',
        personId: 'pC',
        profileId: 'child',
        name: 'Child',
        birthYear: 1990,
        deathYear: null,
        isDeceased: false,
        gender: 'M',
        profilePhoto: null,
        isRegisteredUser: true,
      },
    ],
    couples: [
      {
        id: 'cp1',
        spouseAId: 'nA',
        spouseBId: 'nB',
        status: 'married',
        marriageDate: null,
        divorceDate: null,
        children: ['nC'],
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreeCanvasComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(TreeCanvasComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('treeData', mockTree);
    fixture.componentRef.setInput('selectedNodeId', null);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render person cards for each person', () => {
    const el = fixture.nativeElement as SVGElement;
    const cards = el.querySelectorAll('.person-card');
    expect(cards.length).toBe(3);
  });

  it('should emit nodeSelected when a person card is clicked', () => {
    let emittedId: string | null = null;
    component.nodeSelected.subscribe((p) => (emittedId = p.nodeId));

    const el = fixture.nativeElement as SVGElement;
    const card = el.querySelector('.person-card');
    card?.dispatchEvent(new Event('click'));
    expect(emittedId).toBeTruthy();
  });
});
