import { generateProfileId, normalizeToProfileId } from './profile-id';

describe('normalizeToProfileId', () => {
  it('converts a simple name to lowercase dot-separated', () => {
    expect(normalizeToProfileId('Arjun Rajan')).toBe('arjun.rajan');
  });

  it('handles single name', () => {
    expect(normalizeToProfileId('Arjun')).toBe('arjun');
  });

  it('handles multiple spaces', () => {
    expect(normalizeToProfileId('Arjun  Kumar  Rajan')).toBe('arjun.kumar.rajan');
  });

  it('strips non-alphanumeric characters except dots and underscores', () => {
    expect(normalizeToProfileId("O'Brien-Smith")).toBe('obrien.smith');
  });

  it('trims leading/trailing whitespace', () => {
    expect(normalizeToProfileId('  Arjun Rajan  ')).toBe('arjun.rajan');
  });

  it('handles names with diacritics by stripping them', () => {
    expect(normalizeToProfileId('Jose Garcia')).toBe('jose.garcia');
  });

  it('collapses multiple dots', () => {
    expect(normalizeToProfileId('A  B')).toBe('a.b');
  });
});

describe('generateProfileId', () => {
  it('returns the normalized name if not taken', async () => {
    const checkExists = async (_id: string) => false;
    const result = await generateProfileId('Arjun Rajan', checkExists);
    expect(result).toBe('arjun.rajan');
  });

  it('appends .1 if the base is taken', async () => {
    const taken = new Set(['arjun.rajan']);
    const checkExists = async (id: string) => taken.has(id);
    const result = await generateProfileId('Arjun Rajan', checkExists);
    expect(result).toBe('arjun.rajan.1');
  });

  it('appends .2 if both base and .1 are taken', async () => {
    const taken = new Set(['arjun.rajan', 'arjun.rajan.1']);
    const checkExists = async (id: string) => taken.has(id);
    const result = await generateProfileId('Arjun Rajan', checkExists);
    expect(result).toBe('arjun.rajan.2');
  });

  it('handles up to many collisions', async () => {
    const taken = new Set(
      ['arjun.rajan', ...Array.from({ length: 10 }, (_, i) => `arjun.rajan.${i + 1}`)]
    );
    const checkExists = async (id: string) => taken.has(id);
    const result = await generateProfileId('Arjun Rajan', checkExists);
    expect(result).toBe('arjun.rajan.11');
  });
});
