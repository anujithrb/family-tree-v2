import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, Component, input, output } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
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
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
