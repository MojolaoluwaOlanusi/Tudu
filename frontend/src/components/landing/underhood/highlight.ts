export type TokenType =
  | 'keyword'
  | 'string'
  | 'number'
  | 'comment'
  | 'punct'
  | 'plain';

export interface Token {
  text: string;
  type: TokenType;
}

const KEYWORDS = new Set([
  'const',
  'let',
  'var',
  'function',
  'return',
  'await',
  'async',
  'import',
  'from',
  'export',
  'new',
  'if',
  'else',
  'for',
  'while',
  'class',
  'extends',
  'typeof',
  'in',
  'of',
  'try',
  'catch',
  'finally',
  'throw',
  'default',
  'true',
  'false',
  'null',
  'undefined',
]);

const PUNCT = new Set([
  '{', '}', '(', ')', '[', ']', ';', ',', '.', '=', ':', '<', '>',
  '|', '&', '!', '+', '-', '*', '/', '?',
]);

/** Tokenise a single line of code. Line numbers are added separately. */
export function tokenize(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < line.length) {
    const c = line[i];

    // Line comment: swallow the rest of the line.
    if (c === '/' && line[i + 1] === '/') {
      tokens.push({ text: line.slice(i), type: 'comment' });
      break;
    }

    // String literal. Handles escaped quotes.
    if (c === '"' || c === "'" || c === '`') {
      const q = c;
      let j = i + 1;
      while (j < line.length && line[j] !== q) {
        if (line[j] === '\\') j += 1;
        j += 1;
      }
      j = Math.min(j + 1, line.length);
      tokens.push({ text: line.slice(i, j), type: 'string' });
      i = j;
      continue;
    }

    // Numeric literal (digits + underscores).
    if (/\d/.test(c)) {
      let j = i;
      while (j < line.length && /[\d_]/.test(line[j])) j += 1;
      tokens.push({ text: line.slice(i, j), type: 'number' });
      i = j;
      continue;
    }

    // Identifier or keyword.
    if (/[a-zA-Z_$]/.test(c)) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j += 1;
      const word = line.slice(i, j);
      tokens.push({
        text: word,
        type: KEYWORDS.has(word) ? 'keyword' : 'plain',
      });
      i = j;
      continue;
    }

    // Whitespace run.
    if (/\s/.test(c)) {
      let j = i;
      while (j < line.length && /\s/.test(line[j])) j += 1;
      tokens.push({ text: line.slice(i, j), type: 'plain' });
      i = j;
      continue;
    }

    // Single punctuation character.
    tokens.push({ text: c, type: PUNCT.has(c) ? 'punct' : 'plain' });
    i += 1;
  }
  return tokens;
}

export const TYPE_COLOR: Record<TokenType, string> = {
  keyword: 'text-[#C792EA]',
  string: 'text-[#A5D6A7]',
  number: 'text-[#F5A524]',
  comment: 'text-ink-faint italic',
  punct: 'text-ink-muted',
  plain: 'text-ink',
};

/**
 * Take the first `budget` characters from a token list.
 *
 * Used by the typing animation: `budget` grows as the panel "types", and a
 * token that straddles the boundary is sliced so the visual cursor lands
 * mid-token rather than jumping a whole identifier at a time.
 */
export function clipTokens(tokens: Token[], budget: number): Token[] {
  if (budget <= 0) return [];
  const out: Token[] = [];
  let used = 0;
  for (const t of tokens) {
    if (used + t.text.length <= budget) {
      out.push(t);
      used += t.text.length;
    } else {
      const remaining = budget - used;
      if (remaining > 0) {
        out.push({ text: t.text.slice(0, remaining), type: t.type });
      }
      break;
    }
  }
  return out;
}