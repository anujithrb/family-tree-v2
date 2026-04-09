import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ShellComponent } from './shell.component';
import { HeaderComponent } from '../header/header.component';
import { CommunityState } from '../../state/community.state';

@Component({ selector: 'ft-header', standalone: true, template: '' })
class MockHeaderComponent {}

describe('ShellComponent', () => {
  let fixture: ComponentFixture<ShellComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
      .overrideComponent(ShellComponent, {
        remove: { imports: [HeaderComponent] },
        add: { imports: [MockHeaderComponent] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(ShellComponent);
    httpMock = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    httpMock.expectOne('/api/communities').flush([]);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render header', () => {
    httpMock.expectOne('/api/communities').flush([]);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('ft-header')).toBeTruthy();
  });

  it('should render router outlet', () => {
    httpMock.expectOne('/api/communities').flush([]);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('router-outlet')).toBeTruthy();
  });

  it('should call loadCommunities on init', () => {
    // Flush the HTTP request from the first fixture's ngOnInit
    httpMock.expectOne('/api/communities').flush([]);

    const communityState = TestBed.inject(CommunityState);
    const loadSpy = vi
      .spyOn(communityState, 'loadCommunities')
      .mockReturnValue({ subscribe: () => {} } as ReturnType<
        typeof communityState.loadCommunities
      >);

    const fixture2 = TestBed.createComponent(ShellComponent);
    fixture2.detectChanges();

    expect(loadSpy).toHaveBeenCalled();
  });
});
