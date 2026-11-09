/**
 * Maps any error (Postgres business codes, Supabase Auth, network) to a
 * friendly Spanish message. Raw technical errors are never shown to users;
 * unexpected ones are logged to the console in development only.
 */

/** Business codes raised by our Postgres functions/triggers (errcode P0001). */
const DB_MESSAGES: Record<string, string> = {
  not_authenticated: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  account_suspended: 'Tu cuenta está suspendida. Escríbenos si crees que es un error.',
  forbidden: 'No tienes permiso para hacer esto.',
  invalid_seats: 'Elige entre 1 y 10 cupos.',
  experience_not_found: 'Este plan ya no está disponible.',
  experience_not_available: 'Este plan ya no está disponible.',
  experience_started: 'Este plan ya comenzó.',
  experience_removed: 'Este plan fue retirado por moderación.',
  experience_cancelled: 'Este plan fue cancelado y no se puede modificar.',
  own_experience: 'No puedes hacer esto en tu propio plan.',
  already_joined: 'Ya estás inscrito en este plan.',
  not_enough_seats: 'No quedan cupos suficientes. Alguien se te adelantó.',
  booking_not_found: 'No encontramos esta reserva.',
  booking_not_active: 'Esta reserva ya fue cancelada.',
  starts_in_past: 'La fecha de inicio debe ser en el futuro.',
  invalid_status: 'Estado no válido.',
  capacity_below_bookings: 'La capacidad no puede ser menor que los cupos ya reservados.',
  too_many_photos: 'Puedes subir hasta 8 fotos.',
  location_required: 'Activa tu ubicación para filtrar por distancia.',
  invalid_location: 'La ubicación no es válida.',
  invalid_radius: 'La distancia no es válida.',
  invalid_sort: 'Orden no válido.',
  blocked: 'No puedes interactuar con este usuario.',
  conversation_not_found: 'Esta conversación ya no está disponible.',
  report_target_not_found: 'No encontramos lo que quieres reportar.',
  cannot_report_self: 'No puedes reportarte a ti mismo.',
  invalid_token: 'No pudimos activar las notificaciones.',
}

/** Supabase Auth error codes (error.code) -> Spanish. */
const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  email_not_confirmed: 'Confirma tu correo antes de iniciar sesión.',
  user_already_exists: 'Ya existe una cuenta con este correo.',
  email_exists: 'Ya existe una cuenta con este correo.',
  weak_password: 'La contraseña es muy débil. Usa al menos 8 caracteres, con letras y números.',
  same_password: 'La nueva contraseña debe ser distinta a la anterior.',
  otp_expired: 'El código expiró o no es válido. Pide uno nuevo.',
  over_email_send_rate_limit: 'Enviamos demasiados correos. Espera un momento e inténtalo de nuevo.',
  over_request_rate_limit: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
  user_banned: 'Tu cuenta está suspendida. Escríbenos si crees que es un error.',
  user_not_found: 'No encontramos una cuenta con este correo.',
  session_not_found: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  refresh_token_not_found: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  signup_disabled: 'El registro no está disponible en este momento.',
  validation_failed: 'Revisa los datos ingresados.',
}

/** Postgres SQLSTATE codes we can explain. */
const SQLSTATE_MESSAGES: Record<string, string> = {
  '23505': 'Esto ya existe.',
  '23514': 'Revisa los datos ingresados.',
  '42501': 'No tienes permiso para hacer esto.',
}

export const GENERIC_ERROR = 'Algo salió mal. Inténtalo de nuevo.'
export const NETWORK_ERROR = 'Sin conexión. Revisa tu internet e inténtalo de nuevo.'

type ErrorLike = { message?: unknown; code?: unknown; name?: unknown; status?: unknown }

function asErrorLike(error: unknown): ErrorLike {
  return typeof error === 'object' && error !== null ? (error as ErrorLike) : {}
}

/** The business code if this error came from one of our DB functions. */
export function dbErrorCode(error: unknown): string | null {
  const e = asErrorLike(error)
  const message = typeof e.message === 'string' ? e.message : ''
  return e.code === 'P0001' && message in DB_MESSAGES ? message : null
}

export function isNetworkError(error: unknown): boolean {
  const e = asErrorLike(error)
  const message = typeof e.message === 'string' ? e.message : ''
  return (
    e.name === 'AuthRetryableFetchError' ||
    /network request failed|failed to fetch|network error|timeout/i.test(message)
  )
}

export function toUserMessage(error: unknown, fallback: string = GENERIC_ERROR): string {
  const e = asErrorLike(error)
  const code = typeof e.code === 'string' ? e.code : ''
  const message = typeof e.message === 'string' ? e.message : ''

  const business = dbErrorCode(error)
  if (business) return DB_MESSAGES[business] ?? fallback
  if (code && code in AUTH_MESSAGES) return AUTH_MESSAGES[code] ?? fallback
  if (isNetworkError(error)) return NETWORK_ERROR
  if (code && code in SQLSTATE_MESSAGES) return SQLSTATE_MESSAGES[code] ?? fallback
  // Older Auth servers return only a message.
  if (/invalid login credentials/i.test(message)) return AUTH_MESSAGES.invalid_credentials ?? fallback
  if (/already registered/i.test(message)) return AUTH_MESSAGES.user_already_exists ?? fallback

  logUnexpected(error)
  return fallback
}

export function logUnexpected(error: unknown): void {
  if (__DEV__) console.error('[PlanYá] Unexpected error', error)
}
