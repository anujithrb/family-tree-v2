import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  provideZonelessChangeDetection,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { ParamMap, convertToParamMap } from '@angular/router';
import { TreePageComponent } from './tree-page.component';
import { TreeViewerComponent } from '@family-tree/shared-ui';
import type { TreePerson, TreeResponse } from '@family-tree/shared-ui';
import { TreeState } from '../../core/state/tree.state';

@Component({ selector: 'ft-tree-viewer', standalone: true, template: '' })
class MockTreeViewerComponent {
  readonly treeData = input.required<TreeResponse>();
  readonly selectedNodeId = input<string | null>(null);
  readonly nodeSelected = output<TreePerson>();
}

describe('TreePageComponent', () => {
  let fixture: ComponentFixture<TreePageComponent>;
  let paramMapSubject: Subject<ParamMap>;

  beforeEach(async () => {
    paramMapSubject = new Subject<ParamMap>();

    await TestBed.configureTestingModule({
      imports: [TreePageComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMapSubject.asObservable(),
            snapshot: { paramMap: { get: () => 'community-1' } },
          },
        },
      ],
    })
      .overrideComponent(TreePageComponent, {
        remove: { imports: [TreeViewerComponent] },
        add: { imports: [MockTreeViewerComponent] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(TreePageComponent);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load tree when paramMap emits', () => {
    const treeState = TestBed.inject(TreeState);
    const loadSpy = vi.spyOn(treeState, 'loadTree');

    paramMapSubject.next(convertToParamMap({ id: 'community-abc' }));

    expect(loadSpy).toHaveBeenCalledWith('community-abc');
  });

  it('should reload tree when route id changes', () => {
    const treeState = TestBed.inject(TreeState);
    const loadSpy = vi.spyOn(treeState, 'loadTree');

    paramMapSubject.next(convertToParamMap({ id: 'community-1' }));
    paramMapSubject.next(convertToParamMap({ id: 'community-2' }));

    expect(loadSpy).toHaveBeenCalledWith('community-1');
    expect(loadSpy).toHaveBeenCalledWith('community-2');
    expect(loadSpy).toHaveBeenCalledTimes(2);
  });

  it('should expose mutationError signal initially null', () => {
    expect(fixture.componentInstance.mutationError()).toBeNull();
  });
});
