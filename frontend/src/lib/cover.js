/**
 * Book cover placeholders: a curated palette of muted tones. The title is
 * hashed so the same book always gets the same colour.
 */
const PALETTE = [
  ['#5b7c6f', '#3f5d52'], // sage
  ['#5d6b82', '#41506a'], // slate
  ['#7a5b7c', '#5c3f5f'], // plum
  ['#b08a3e', '#8a6a2a'], // ochre
  ['#b5634a', '#8f4a36'], // terracotta
  ['#3f7f7a', '#2c605c'], // teal
  ['#a8606f', '#844555'], // rose
  ['#6f7a4a', '#525c33'], // olive
];

function hash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function coverColors(title = '') {
  const [from, to] = PALETTE[hash(title.trim().toLowerCase()) % PALETTE.length];
  return { from, to };
}

export function coverInitial(title = '') {
  const clean = title.trim();
  if (!clean) return '?';
  // Skip a leading article so "The Hobbit" shows "H" rather than every book showing "T".
  const withoutArticle = clean.replace(/^(the|a|an)\s+/i, '');
  return (withoutArticle || clean).charAt(0).toUpperCase();
}
