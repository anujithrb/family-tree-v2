import { PanelNavigationService } from './panel-navigation.service';

describe('PanelNavigationService', () => {
  let service: PanelNavigationService;

  beforeEach(() => {
    service = new PanelNavigationService();
  });

  it('should start closed', () => {
    expect(service.isOpen()).toBe(false);
    expect(service.currentView()).toBeNull();
  });

  it('should open to a view', () => {
    service.open('person-detail', null);
    expect(service.isOpen()).toBe(true);
    expect(service.currentView()).toBe('person-detail');
  });

  it('should navigate and track history', () => {
    service.open('person-detail', null);
    service.navigate('person-edit', null);
    expect(service.currentView()).toBe('person-edit');
    expect(service.canGoBack()).toBe(true);
  });

  it('should go back in history', () => {
    service.open('person-detail', null);
    service.navigate('person-edit', null);
    service.back();
    expect(service.currentView()).toBe('person-detail');
    expect(service.canGoBack()).toBe(false);
  });

  it('should close and reset state', () => {
    service.open('person-detail', null);
    service.close();
    expect(service.isOpen()).toBe(false);
    expect(service.currentView()).toBeNull();
  });
});
