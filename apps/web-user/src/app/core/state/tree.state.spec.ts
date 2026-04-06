import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TreeState } from './tree.state';
import type { TreePerson } from '@family-tree/shared-ui';

describe('TreeState', () => {
  let state: TreeState;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    state = TestBed.inject(TreeState);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should start with no tree data and no selection', () => {
    expect(state.treeData()).toBeNull();
    expect(state.selectedNode()).toBeNull();
  });

  it('should load tree and store data', () => {
    state.loadTree('c1');
    const req = httpMock.expectOne('/api/communities/c1/tree');
    req.flush({
      communityId: 'c1',
      communityName: 'Test',
      people: [
        {
          nodeId: 'n1',
          personId: 'p1',
          profileId: 'pr1',
          name: 'Alice',
          birthYear: null,
          deathYear: null,
          isDeceased: false,
          gender: 'F',
          profilePhoto: null,
          isRegisteredUser: false,
        },
      ],
      couples: [],
    });
    expect(state.treeData()?.communityId).toBe('c1');
    expect(state.treeData()?.people).toHaveLength(1);
  });

  it('should select and deselect nodes', () => {
    const person: TreePerson = {
      nodeId: 'n1',
      personId: 'p1',
      profileId: 'pr1',
      name: 'Alice',
      birthYear: null,
      deathYear: null,
      isDeceased: false,
      gender: 'F',
      profilePhoto: null,
      isRegisteredUser: false,
    };
    state.selectNode(person);
    expect(state.selectedNode()?.nodeId).toBe('n1');

    state.clearSelection();
    expect(state.selectedNode()).toBeNull();
  });
});
