import { dbErrorCode, GENERIC_ERROR, NETWORK_ERROR, toUserMessage } from './errors'

describe('toUserMessage', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => undefined))
  afterEach(() => jest.restoreAllMocks())

  it('maps database business codes', () => {
    const err = { code: 'P0001', message: 'not_enough_seats' }
    expect(dbErrorCode(err)).toBe('not_enough_seats')
    expect(toUserMessage(err)).toBe('No quedan cupos suficientes. Alguien se te adelantó.')
  })

  it('maps Supabase Auth codes', () => {
    expect(toUserMessage({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe(
      'Correo o contraseña incorrectos.',
    )
    expect(toUserMessage({ code: 'otp_expired', message: 'Token has expired or is invalid' })).toBe(
      'El código expiró o no es válido. Pide uno nuevo.',
    )
  })

  it('recognises network failures', () => {
    expect(toUserMessage(new TypeError('Network request failed'))).toBe(NETWORK_ERROR)
    expect(toUserMessage({ name: 'AuthRetryableFetchError', message: '' })).toBe(NETWORK_ERROR)
  })

  it('never shows raw technical errors', () => {
    expect(toUserMessage(new Error('relation "foo" does not exist'))).toBe(GENERIC_ERROR)
    expect(toUserMessage({ code: 'P0001', message: 'some_unknown_code' })).toBe(GENERIC_ERROR)
    expect(toUserMessage(undefined)).toBe(GENERIC_ERROR)
    expect(toUserMessage('boom', 'Custom')).toBe('Custom')
  })

  it('maps permission and constraint SQLSTATEs', () => {
    expect(toUserMessage({ code: '42501', message: 'new row violates row-level security policy' })).toBe(
      'No tienes permiso para hacer esto.',
    )
  })
})
