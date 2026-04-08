import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, Component, input, output } from '@angular/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TreePageComponent } from './tree-page.component';
import { TreeViewerComponent } from '@family-tree/shared-ui';
import type { TreePerson, TreeResponse } from '@family-tree/shared-ui';

@Component({ selector: 'ft-tree-viewer', standalone: true, template: '' })
class MockTreeViewerComponent {
  readonly treeData = input.required<TreeResponse>();
  readonly selectedNodeId = input<string | null>(null);
  readonly nodeSelected = output<TreePerson>();
}

describe('TreePageComponent', () => {
  let fixture: ComponentFixture<TreePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreePageComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'community-1' } } },
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
});
