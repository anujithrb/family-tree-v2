import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TreeConnectorComponent } from './tree-connector.component';

describe('TreeConnectorComponent', () => {
  let fixture: ComponentFixture<TreeConnectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreeConnectorComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(TreeConnectorComponent);
    fixture.componentRef.setInput('spouseAX', 0);
    fixture.componentRef.setInput('spouseBX', 252);
    fixture.componentRef.setInput('coupleY', 40);
    fixture.componentRef.setInput('coupleCx', 186);
    fixture.detectChanges();
  });

  it('should render spouse connector line', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const line = fixture.nativeElement.querySelector('.spouse-line');
    expect(line).toBeTruthy();
  });

  it('should render drop line when hasChildren is true', () => {
    fixture.componentRef.setInput('hasChildren', true);
    fixture.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const dropLine = fixture.nativeElement.querySelector('.drop-line');
    expect(dropLine).toBeTruthy();
  });

  it('should not render drop line when no children', () => {
    fixture.componentRef.setInput('hasChildren', false);
    fixture.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const dropLine = fixture.nativeElement.querySelector('.drop-line');
    expect(dropLine).toBeFalsy();
  });
});
