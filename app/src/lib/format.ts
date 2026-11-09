/**
 * Display formatting (es-CL). Money is formatted by hand instead of Intl so the
 * output is identical on every JS engine: "$25.000".
 */

function groupThousands(n: number): string {
  return Math.trunc(Math.abs(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** 25000 -> "$25.000"; -1500 -> "-$1.500". CLP has no decimals. */
export function formatCLP(amount: number): string {
  if (!Number.isFinite(amount)) return '$0'
  const rounded = Math.round(amount)
  return `${rounded < 0 ? '-' : ''}$${groupThousands(rounded)}`
}

/** "Gratis" or "$25.000". */
export function formatPrice(isFree: boolean, priceClp: number | null | undefined): string {
  if (isFree || priceClp == null) return 'Gratis'
  return formatCLP(priceClp)
}

export function seatsLeft(capacity: number, seatsTaken: number): number {
  return Math.max(capacity - seatsTaken, 0)
}

/** "Quedan 3 cupos" / "Queda 1 cupo" / "Sin cupos". */
export function formatSeatsLeft(capacity: number, seatsTaken: number): string {
  const left = seatsLeft(capacity, seatsTaken)
  if (left === 0) return 'Sin cupos'
  if (left === 1) return 'Queda 1 cupo'
  return `Quedan ${left} cupos`
}

/** "8/12 cupos" (people joined / capacity), or "12 cupos" while nobody has joined yet. */
export function formatSeatsTaken(capacity: number, seatsTaken: number): string {
  const taken = Math.min(Math.max(seatsTaken, 0), capacity)
  return taken === 0 ? `${capacity} cupos` : `${taken}/${capacity} cupos`
}

/** 0.85 -> "850 m"; 1.42 -> "1,4 km"; 12.3 -> "12 km". */
export function formatDistanceKm(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km) || km < 0) return ''
  if (km < 1) return `${Math.max(Math.round((km * 1000) / 10) * 10, 10)} m`
  if (km < 10) return `${(Math.round(km * 10) / 10).toFixed(1).replace('.', ',')} km`
  return `${groupThousands(Math.round(km))} km`
}

/** 4.5 -> "4,5". */
export function formatRating(avg: number | string | null | undefined): string {
  const n = Number(avg ?? 0)
  return (Math.round(n * 10) / 10).toFixed(1).replace('.', ',')
}

/** Initials for avatar fallbacks: "Camila Rivas" -> "CR". */
export function initials(fullName: string | null | undefined): string {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}
