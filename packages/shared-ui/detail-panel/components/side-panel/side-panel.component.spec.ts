import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { SidePanelComponent } from './side-panel.component';

describe('SidePanelComponent', () => {
  let fixture: ComponentFixture<SidePanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidePanelComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(SidePanelComponent);
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show panel when isOpen is true', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const panel: Element = fixture.nativeElement.querySelector('.side-panel');

    expect(panel.classList.contains('open')).toBe(true);
  });

  it('should hide panel when isOpen is false', () => {
    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const panel: Element = fixture.nativeElement.querySelector('.side-panel');

    expect(panel.classList.contains('open')).toBe(false);
  });
});
