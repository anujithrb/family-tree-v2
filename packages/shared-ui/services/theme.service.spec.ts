import { ThemeService, Theme } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.removeItem('ft-theme');
    document.documentElement.removeAttribute('data-theme');
    service = new ThemeService(document);
  });

  it('should default to system theme when no localStorage value', () => {
    expect(service.theme).toBe('system');
  });

  it('should read theme from localStorage on init', () => {
    localStorage.setItem('ft-theme', 'dark');
    const freshService = new ThemeService(document);
    expect(freshService.theme).toBe('dark');
  });

  it('should set data-theme attribute when toggling to dark', () => {
    service.setTheme('dark');
    expect(service.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should set data-theme attribute when toggling to light', () => {
    service.setTheme('light');
    expect(service.theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('should remove data-theme attribute when set to system', () => {
    service.setTheme('dark');
    service.setTheme('system');
    expect(service.theme).toBe('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('should persist choice to localStorage', () => {
    service.setTheme('dark');
    expect(localStorage.getItem('ft-theme')).toBe('dark');
  });

  it('should remove localStorage entry when set to system', () => {
    service.setTheme('dark');
    service.setTheme('system');
    expect(localStorage.getItem('ft-theme')).toBeNull();
  });
});
