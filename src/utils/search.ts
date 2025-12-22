export function normalizeForSearch(input: string) {
  return input
    .toLocaleLowerCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function matchesQuery(text: string, query: string) {
  if (!query) return true
  return normalizeForSearch(text).includes(query)
}

