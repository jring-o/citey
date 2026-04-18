// ---------------------------------------------------------------------------
// §7.1.4 — LaTeX special-character escape table + diacritics lookup
// ---------------------------------------------------------------------------

/**
 * Map of LaTeX special characters to their escaped forms.
 * Used in a single-pass character-by-character replacement to avoid
 * double-escaping (e.g. `{}` in `\textbackslash{}` must not be re-escaped).
 */
const LATEX_SPECIALS: Readonly<Record<string, string>> = {
  '\\': '\\textbackslash{}',
  '&': '\\&',
  '%': '\\%',
  $: '\\$',
  '#': '\\#',
  _: '\\_',
  '{': '\\{',
  '}': '\\}',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
};

/**
 * Common diacritics mapped to LaTeX-safe forms.
 * Characters not in this table are passed through verbatim (UTF-8).
 */
const DIACRITICS: Readonly<Record<string, string>> = {
  á: "\\'a",
  à: '\\`a',
  ä: '\\"a',
  â: '\\^a',
  ã: '\\~a',
  å: '\\aa{}',
  æ: '\\ae{}',
  ç: '\\c{c}',
  é: "\\'e",
  è: '\\`e',
  ë: '\\"e',
  ê: '\\^e',
  í: "\\'i",
  ì: '\\`i',
  ï: '\\"i',
  î: '\\^i',
  ñ: '\\~n',
  ó: "\\'o",
  ò: '\\`o',
  ö: '\\"o',
  ô: '\\^o',
  õ: '\\~o',
  ø: '\\o{}',
  ú: "\\'u",
  ù: '\\`u',
  ü: '\\"u',
  û: '\\^u',
  ý: "\\'y",
  ÿ: '\\"y',
  ß: '\\ss{}',
  Á: "\\'A",
  À: '\\`A',
  Ä: '\\"A',
  Â: '\\^A',
  Ã: '\\~A',
  Å: '\\AA{}',
  Æ: '\\AE{}',
  Ç: '\\c{C}',
  É: "\\'E",
  È: '\\`E',
  Ë: '\\"E',
  Ê: '\\^E',
  Í: "\\'I",
  Ì: '\\`I',
  Ï: '\\"I',
  Î: '\\^I',
  Ñ: '\\~N',
  Ó: "\\'O",
  Ò: '\\`O',
  Ö: '\\"O',
  Ô: '\\^O',
  Õ: '\\~O',
  Ø: '\\O{}',
  Ú: "\\'U",
  Ù: '\\`U',
  Ü: '\\"U',
  Û: '\\^U',
  Ý: "\\'Y",
  Ÿ: '\\"Y',
};

/**
 * Escape a string for safe inclusion in a BibTeX field value.
 *
 * Uses a single-pass character-by-character approach so that replacement
 * strings (e.g. `\textbackslash{}`) are never re-processed.
 *
 * 1. Each character is checked against the LaTeX specials map.
 * 2. Then checked against the diacritics map.
 * 3. Otherwise passed through verbatim (file is UTF-8).
 */
export function escapeLatex(value: string): string {
  let out = '';
  for (const ch of value) {
    const special = LATEX_SPECIALS[ch];
    if (special !== undefined) {
      out += special;
      continue;
    }
    const diacritic = DIACRITICS[ch];
    if (diacritic !== undefined) {
      out += diacritic;
      continue;
    }
    out += ch;
  }
  return out;
}

export { LATEX_SPECIALS, DIACRITICS };
