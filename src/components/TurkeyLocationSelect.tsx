'use client'

import { useMemo, type CSSProperties, type ChangeEvent } from 'react'
import { TURKEY_CITIES, getDistrictsForCity } from '@/lib/turkey-locations'

type Props = {
  city: string
  district: string
  onCityChange: (city: string) => void
  onDistrictChange: (district: string) => void
  disabled?: boolean
  inputStyle?: CSSProperties
}

export default function TurkeyLocationSelect({
  city,
  district,
  onCityChange,
  onDistrictChange,
  disabled = false,
  inputStyle,
}: Props) {
  const districts = useMemo(() => getDistrictsForCity(city), [city])

  const handleCityChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextCity = event.target.value
    onCityChange(nextCity)
    // District must always belong to the selected province.
    onDistrictChange('')
  }

  return (
    <>
      <label style={{ display: 'grid', gap: '0.35rem' }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>İl</span>
        <select
          value={city}
          onChange={handleCityChange}
          disabled={disabled}
          required
          style={inputStyle}
          aria-label="İl"
        >
          <option value="">İl seçin</option>
          {TURKEY_CITIES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: 'grid', gap: '0.35rem' }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>İlçe</span>
        <select
          value={district}
          onChange={(event) => onDistrictChange(event.target.value)}
          disabled={disabled || !city}
          required
          style={inputStyle}
          aria-label="İlçe"
        >
          <option value="">{city ? 'İlçe seçin' : 'Önce il seçin'}</option>
          {districts.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}
