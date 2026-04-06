import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { BottomSheetComponent } from './bottom-sheet.component';

describe('BottomSheetComponent', () => {
  let fixture: ComponentFixture<BottomSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomSheetComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomSheetComponent);
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should default to hidden state', () => {
    fixture.componentRef.setInput('state', 'hidden');
    fixture.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const sheet: Element = fixture.nativeElement.querySelector('.bottom-sheet');

    expect(sheet.classList.contains('hidden')).toBe(true);
  });

  it('should show peek state', () => {
    fixture.componentRef.setInput('state', 'peek');
    fixture.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const sheet: Element = fixture.nativeElement.querySelector('.bottom-sheet');

    expect(sheet.classList.contains('peek')).toBe(true);
  });

  it('should show expanded state', () => {
    fixture.componentRef.setInput('state', 'expanded');
    fixture.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const sheet: Element = fixture.nativeElement.querySelector('.bottom-sheet');

    expect(sheet.classList.contains('expanded')).toBe(true);
  });
});
