import { describeWeatherCode } from './weather'

describe('describeWeatherCode', () => {
  it('maps WMO codes to Spanish labels and day/night icons', () => {
    expect(describeWeatherCode(0, true)).toEqual({ label: 'Despejado', icon: 'sunny-outline' })
    expect(describeWeatherCode(0, false)).toEqual({ label: 'Despejado', icon: 'moon-outline' })
    expect(describeWeatherCode(3, true).label).toBe('Nublado')
    expect(describeWeatherCode(61, true).label).toBe('Lluvia')
    expect(describeWeatherCode(81, true).label).toBe('Chubascos')
    expect(describeWeatherCode(73, true).label).toBe('Nieve')
    expect(describeWeatherCode(95, true).label).toBe('Tormenta')
    expect(describeWeatherCode(999, true).label).toBe('Tormenta')
    expect(describeWeatherCode(30, true).label).toBe('Clima')
  })
})
