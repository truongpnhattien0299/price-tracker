// Search key for Vietnamese text: lowercase, no diacritics, đ -> d, single spaces.
// "Bách Hoá  XANH" -> "bach hoa xanh", so "bach hoa" finds it (plans/09).
export function searchKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

// `searchKey(q)` wrapped for LIKE, with LIKE's own wildcards escaped.
export function likePattern(q: string): string {
  return `%${searchKey(q).replace(/[\\%_]/g, '\\$&')}%`;
}
