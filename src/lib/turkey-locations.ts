import locations from '@/data/turkey-locations.json'

export const TURKEY_CITIES: readonly string[] = locations.cities

const districtsByCity = locations.districtsByCity as Record<string, string[]>

export function getDistrictsForCity(city: string): readonly string[] {
  return districtsByCity[city] ?? []
}

export function isValidTurkeyLocation(city: string, district: string): boolean {
  const districts = districtsByCity[city]
  return Boolean(districts?.includes(district))
}
