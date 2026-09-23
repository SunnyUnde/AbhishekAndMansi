export const LANGS = ["mr", "en"];
export const DEFAULT_LANG = "mr";
export const STORAGE_KEY = "am-lang";

// Returns the key name rather than throwing so a missing string is visible
// on the page instead of silently blank. Tests catch these before launch.
export function resolve(strings, key, lang) {
  const entry = strings[key];
  if (!entry) return key;
  const value = entry[lang];
  if (typeof value !== "string" || value === "") return key;
  return value;
}

export function findMissing(strings) {
  const missing = [];
  for (const [key, entry] of Object.entries(strings)) {
    const incomplete = LANGS.some((lang) => typeof entry[lang] !== "string" || entry[lang] === "");
    if (incomplete) missing.push(key);
  }
  return missing;
}

export function readLang(storage) {
  try {
    const stored = storage.getItem(STORAGE_KEY);
    return LANGS.includes(stored) ? stored : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

export function writeLang(storage, lang) {
  try {
    storage.setItem(STORAGE_KEY, lang);
  } catch {
    // Private browsing can block storage. The site still works, it just
    // forgets the choice on reload.
  }
}
