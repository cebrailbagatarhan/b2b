const TURKISH_CHARACTERS: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
}

const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function categoryNameToSlug(name: string) {
  return name
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, (character) => TURKISH_CHARACTERS[character])
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function categoryNameMatchesSlug(name: string, slug: string) {
  const routeSlug = slug.trim().toLowerCase()

  return CATEGORY_SLUG_PATTERN.test(routeSlug) && categoryNameToSlug(name) === routeSlug
}
