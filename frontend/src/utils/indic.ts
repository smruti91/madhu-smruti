/**
 * Lightweight Roman → Indic transliteration helper for the write-up editor.
 *
 * This is a convenience for contributors who do not have an Odia/Hindi
 * keyboard installed: they type romanized text and insert the native script.
 * Contributors with an input method can always type Unicode directly — the
 * editor stores exactly what is inserted and applies no transformation.
 *
 * The mapping is intentionally compact and covers common sounds rather than
 * trying to be a scholarly ITRANS engine.
 */

export type IndicScript = "odia" | "hindi";

interface ScriptMap {
  /** Consonant base letters, keyed by romanized form (longest match wins). */
  consonants: Record<string, string>;
  /** Independent (standalone) vowels. */
  vowels: Record<string, string>;
  /** Dependent vowel signs used after a consonant. */
  matras: Record<string, string>;
  virama: string;
  digits: string[];
}

const DEVANAGARI: ScriptMap = {
  consonants: {
    shh: "ष",
    kh: "ख",
    gh: "घ",
    ng: "ङ",
    ch: "छ",
    jh: "झ",
    ny: "ञ",
    th: "थ",
    dh: "ध",
    ph: "फ",
    bh: "भ",
    sh: "श",
    k: "क",
    g: "ग",
    c: "च",
    j: "ज",
    t: "त",
    d: "द",
    n: "न",
    p: "प",
    b: "ब",
    m: "म",
    y: "य",
    r: "र",
    l: "ल",
    v: "व",
    s: "स",
    h: "ह",
  },
  vowels: {
    aa: "आ",
    ii: "ई",
    uu: "ऊ",
    ai: "ऐ",
    au: "औ",
    a: "अ",
    i: "इ",
    u: "उ",
    e: "ए",
    o: "ओ",
  },
  matras: {
    aa: "ा",
    ii: "ी",
    uu: "ू",
    ai: "ै",
    au: "ौ",
    i: "ि",
    u: "ु",
    e: "े",
    o: "ो",
  },
  virama: "्",
  digits: ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"],
};

const ODIA: ScriptMap = {
  consonants: {
    shh: "ଷ",
    kh: "ଖ",
    gh: "ଘ",
    ng: "ଙ",
    ch: "ଛ",
    jh: "ଝ",
    ny: "ଞ",
    th: "ଥ",
    dh: "ଧ",
    ph: "ଫ",
    bh: "ଭ",
    sh: "ଶ",
    k: "କ",
    g: "ଗ",
    c: "ଚ",
    j: "ଜ",
    t: "ତ",
    d: "ଦ",
    n: "ନ",
    p: "ପ",
    b: "ବ",
    m: "ମ",
    y: "ୟ",
    r: "ର",
    l: "ଲ",
    v: "ବ",
    s: "ସ",
    h: "ହ",
  },
  vowels: {
    aa: "ଆ",
    ii: "ଈ",
    uu: "ଊ",
    ai: "ଐ",
    au: "ଔ",
    a: "ଅ",
    i: "ଇ",
    u: "ଉ",
    e: "ଏ",
    o: "ଓ",
  },
  matras: {
    aa: "ା",
    ii: "ୀ",
    uu: "ୂ",
    ai: "ୈ",
    au: "ୌ",
    i: "ି",
    u: "ୁ",
    e: "େ",
    o: "ୋ",
  },
  virama: "୍",
  digits: ["୦", "୧", "୨", "୩", "୪", "୫", "୬", "୭", "୮", "୯"],
};

const MAPS: Record<IndicScript, ScriptMap> = {
  odia: ODIA,
  hindi: DEVANAGARI,
};

/** Returns true when a string already contains characters of the target script. */
export function containsIndic(text: string, script: IndicScript): boolean {
  const range = script === "odia" ? /[\u0B00-\u0B7F]/ : /[\u0900-\u097F]/;
  return range.test(text);
}

/**
 * Converts romanized text to the chosen script.
 * Example: `transliterate("namaste", "hindi")` → "नमासते" (rough guide).
 */
export function transliterate(input: string, script: IndicScript): string {
  const map = MAPS[script];
  const tokens = tokenize(input, map);
  let output = "";
  let pendingConsonant = false;
  let matraUsed = false;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (map.consonants[token]) {
      if (pendingConsonant && !matraUsed) output += map.virama;
      output += map.consonants[token];
      pendingConsonant = true;
      matraUsed = false;
      continue;
    }

    // A short "a" after a consonant is the inherent vowel in normal
    // romanization (na → न), so it is not written as a separate sign.
    // At the end of a word it usually represents the long "aa" matra.
    if (token === "a" && pendingConsonant && !matraUsed) {
      if (index === tokens.length - 1) output += map.matras.aa;
      pendingConsonant = false;
      matraUsed = false;
      continue;
    }

    if (map.vowels[token]) {
      if (pendingConsonant && !matraUsed && map.matras[token]) {
        output += map.matras[token];
        matraUsed = true;
      } else {
        output += map.vowels[token];
      }
      pendingConsonant = false;
      continue;
    }

    output += token;
    pendingConsonant = false;
    matraUsed = false;
  }

  return output;
}

function tokenize(input: string, map: ScriptMap): string[] {
  const keys = [
    ...Object.keys(map.consonants),
    ...Object.keys(map.vowels),
  ].sort((a, b) => b.length - a.length);

  const lower = input.toLowerCase();
  const tokens: string[] = [];
  let index = 0;

  while (index < lower.length) {
    const char = lower[index];

    if (/\d/.test(char)) {
      tokens.push(map.digits[Number(char)]);
      index += 1;
      continue;
    }

    const match = keys.find((key) => lower.startsWith(key, index));
    if (match) {
      tokens.push(match);
      index += match.length;
      continue;
    }

    tokens.push(input[index]);
    index += 1;
  }

  return tokens;
}

export const SCRIPT_LABELS: Record<IndicScript | "english", string> = {
  english: "English",
  odia: "ଓଡ଼ିଆ",
  hindi: "हिन्दी",
};
