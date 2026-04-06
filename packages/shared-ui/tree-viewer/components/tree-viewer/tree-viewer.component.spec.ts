import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TreeViewerComponent } from './tree-viewer.component';
import type { TreeResponse } from '../../models/tree-data.model';

describe('TreeViewerComponent', () => {
  let fixture: ComponentFixture<TreeViewerComponent>;
  let component: TreeViewerComponent;

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
    ],
    couples: [
      {
        id: 'cp1',
        spouseAId: 'nA',
        spouseBId: 'nB',
        status: 'married',
        marriageDate: null,
        divorceDate: null,
        children: [],
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreeViewerComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(TreeViewerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('treeData', mockTree);
    fixture.componentRef.setInput('selectedNodeId', null);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render an SVG element', () => {
    const el = fixture.nativeElement as HTMLElement;
    const svg = el.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('should render zoom control buttons', () => {
    const el = fixture.nativeElement as HTMLElement;
    const buttons = el.querySelectorAll('.zoom-controls button');
    expect(buttons.length).toBe(3); // zoom in, zoom out, fit
  });
});
