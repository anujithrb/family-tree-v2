export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'ft-theme';

export class ThemeService {
  private _theme: Theme;

  get theme(): Theme {
    return this._theme;
  }

  constructor(private readonly doc: Document = document) {
    this._theme = this.loadTheme();
    this.applyTheme(this._theme);
  }

  setTheme(theme: Theme): void {
    this._theme = theme;
    this.applyTheme(theme);
    this.persistTheme(theme);
  }

  private loadTheme(): Theme {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return 'system';
  }

  private applyTheme(theme: Theme): void {
    const htmlEl = this.doc.documentElement;
    if (theme === 'system') {
      htmlEl.removeAttribute('data-theme');
    } else {
      htmlEl.setAttribute('data-theme', theme);
    }
  }

  private persistTheme(theme: Theme): void {
    if (theme === 'system') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, theme);
    }
  }
}
