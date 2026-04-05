/**
 * Normalize a human name into a profileId format.
 * "Arjun Rajan" → "arjun.rajan"
 */
export function normalizeToProfileId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip diacritics
    .replace(/[-_]+/g, ' ')            // hyphens/underscores → spaces (become dots later)
    .replace(/[^a-z0-9\s]/g, '')       // remove remaining non-alphanumeric (keep spaces)
    .replace(/\s+/g, '.')              // spaces → dots
    .replace(/\.{2,}/g, '.')           // collapse multiple dots
    .replace(/^\.+|\.+$/g, '');        // trim leading/trailing dots
}

/**
 * Generate a unique profileId from a name.
 * If "arjun.rajan" is taken, tries "arjun.rajan.1", "arjun.rajan.2", etc.
 *
 * @param name - The person's display name
 * @param checkExists - Async function that returns true if a profileId is already taken
 */
export async function generateProfileId(
  name: string,
  checkExists: (profileId: string) => Promise<boolean>,
): Promise<string> {
  const base = normalizeToProfileId(name);

  if (!(await checkExists(base))) {
    return base;
  }

  let counter = 1;
  while (await checkExists(`${base}.${counter}`)) {
    counter++;
  }

  return `${base}.${counter}`;
}
