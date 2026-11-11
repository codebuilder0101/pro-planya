/** Form schemas with Spanish (Chile) validation messages. */
import { z } from 'zod'

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Ingresa tu correo.')
  .max(254, 'El correo es muy largo.')
  .pipe(z.email('Ingresa un correo válido.'))
  .transform((v) => v.toLowerCase())

/** Matches the Auth settings: min 8 chars, letters and digits. */
export const newPasswordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(72, 'La contraseña es muy larga.')
  .regex(/[A-Za-zÀ-ÿ]/, 'La contraseña debe incluir al menos una letra.')
  .regex(/\d/, 'La contraseña debe incluir al menos un número.')

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, 'Ingresa tu nombre.')
  .max(80, 'El nombre puede tener hasta 80 caracteres.')

export type AccountRole = 'explorer' | 'host'

/** Sign-up lets you tick explorer, host or both (a host account can also explore). */
export const rolesSchema = z.array(z.enum(['explorer', 'host'])).min(1, 'Elige al menos una opción.')

/** The account role saved in the database: host when host is ticked (it includes exploring). */
export function accountRole(roles: readonly AccountRole[]): AccountRole {
  return roles.includes('host') ? 'host' : 'explorer'
}

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Ingresa tu contraseña.'),
})
export type SignInValues = z.input<typeof signInSchema>
export type SignInOutput = z.output<typeof signInSchema>

export const signUpSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  password: newPasswordSchema,
  roles: rolesSchema,
})
export type SignUpValues = z.input<typeof signUpSchema>
export type SignUpOutput = z.output<typeof signUpSchema>

export const forgotPasswordSchema = z.object({ email: emailSchema })
export type ForgotPasswordValues = z.input<typeof forgotPasswordSchema>
export type ForgotPasswordOutput = z.output<typeof forgotPasswordSchema>

/** Recovery codes are 6 digits (8 if the server is set to the Supabase default). */
export const RESET_CODE_MAX = 8

export const resetPasswordSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6,8}$/, 'Ingresa el código completo que te enviamos.'),
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Repite la nueva contraseña.'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  })
export type ResetPasswordValues = z.input<typeof resetPasswordSchema>
export type ResetPasswordOutput = z.output<typeof resetPasswordSchema>

export const profileSchema = z.object({
  fullName: fullNameSchema,
  bio: z.string().trim().max(500, 'La descripción puede tener hasta 500 caracteres.'),
  city: z.string().trim().max(60, 'La ciudad puede tener hasta 60 caracteres.'),
  interests: z.array(z.string()).max(20, 'Puedes elegir hasta 20 intereses.'),
})
export type ProfileValues = z.input<typeof profileSchema>
export type ProfileOutput = z.output<typeof profileSchema>
