import { profileSchema, resetPasswordSchema, signInSchema, signUpSchema } from './validation'

const firstError = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? null : (result.error?.issues[0]?.message ?? null)

describe('signInSchema', () => {
  it('normalises the email', () => {
    const r = signInSchema.parse({ email: '  Ana@Correo.CL ', password: 'x' })
    expect(r.email).toBe('ana@correo.cl')
  })
  it('gives Spanish messages', () => {
    expect(firstError(signInSchema.safeParse({ email: '', password: 'x' }))).toBe('Ingresa tu correo.')
    expect(firstError(signInSchema.safeParse({ email: 'ana@', password: 'x' }))).toBe(
      'Ingresa un correo válido.',
    )
    expect(firstError(signInSchema.safeParse({ email: 'ana@correo.cl', password: '' }))).toBe(
      'Ingresa tu contraseña.',
    )
  })
})

describe('signUpSchema', () => {
  const valid = { fullName: 'Ana Pérez', email: 'ana@correo.cl', password: 'clave1234', role: 'explorer' }
  it('accepts a valid sign-up', () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true)
  })
  it('requires a role', () => {
    expect(firstError(signUpSchema.safeParse({ ...valid, role: undefined }))).toBe(
      'Elige cómo quieres usar PlanYá.',
    )
    expect(signUpSchema.safeParse({ ...valid, role: 'admin' }).success).toBe(false)
  })
  it('enforces password rules', () => {
    expect(firstError(signUpSchema.safeParse({ ...valid, password: 'abc1' }))).toBe(
      'La contraseña debe tener al menos 8 caracteres.',
    )
    expect(firstError(signUpSchema.safeParse({ ...valid, password: '12345678' }))).toBe(
      'La contraseña debe incluir al menos una letra.',
    )
    expect(firstError(signUpSchema.safeParse({ ...valid, password: 'abcdefgh' }))).toBe(
      'La contraseña debe incluir al menos un número.',
    )
  })
})

describe('resetPasswordSchema', () => {
  it('requires a 6-digit code and matching passwords', () => {
    expect(
      resetPasswordSchema.safeParse({ code: '123456', password: 'clave1234', confirmPassword: 'clave1234' })
        .success,
    ).toBe(true)
    expect(
      firstError(
        resetPasswordSchema.safeParse({ code: '12345', password: 'clave1234', confirmPassword: 'clave1234' }),
      ),
    ).toBe('El código tiene 6 dígitos.')
    expect(
      firstError(
        resetPasswordSchema.safeParse({
          code: '123456',
          password: 'clave1234',
          confirmPassword: 'clave12345',
        }),
      ),
    ).toBe('Las contraseñas no coinciden.')
  })
})

describe('profileSchema', () => {
  it('limits bio length', () => {
    const r = profileSchema.safeParse({ fullName: 'Ana', bio: 'x'.repeat(501), city: '', interests: [] })
    expect(firstError(r)).toBe('La descripción puede tener hasta 500 caracteres.')
  })
})
