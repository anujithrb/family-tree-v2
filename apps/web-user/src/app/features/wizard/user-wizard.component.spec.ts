import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, Component, input, output } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { UserWizardComponent } from './user-wizard.component';
import { WizardShellComponent } from '@family-tree/shared-ui';
import type { WizardConfig, WizardSubmission } from '@family-tree/shared-ui';

@Component({ selector: 'ft-wizard-shell', standalone: true, template: '' })
class MockWizardShellComponent {
  readonly config = input.required<WizardConfig>();
  readonly submitted = output<WizardSubmission>();
}

describe('UserWizardComponent', () => {
  let fixture: ComponentFixture<UserWizardComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserWizardComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
      .overrideComponent(UserWizardComponent, {
        remove: { imports: [WizardShellComponent] },
        add: { imports: [MockWizardShellComponent] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(UserWizardComponent);
    httpMock = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should call createCommunityWithTree with full tree data on submit', () => {
    const submission: WizardSubmission = {
      communityName: 'My Family',
      nodes: [{ tempId: 'self', name: 'Alice', gender: 'F', isSelf: true }],
      couples: [{ id: 'couple-1', spouseAId: 'self', spouseBId: 'bob' }],
      children: [{ coupleId: 'couple-1', childId: 'child-1' }],
    };

    fixture.componentInstance.onSubmit(submission);

    const req = httpMock.expectOne('/api/communities/with-tree');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'My Family',
      nodes: submission.nodes,
      couples: submission.couples,
      children: submission.children,
    });
    req.flush({ id: 'c1', name: 'My Family', createdAt: new Date().toISOString() });
  });
});
