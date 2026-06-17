import { format as dateFnsFormat } from "date-fns"

export function formatDate(
  date: Date | string | number | null | undefined,
  format: string = "PPP"
): string {
  if (!date) return ""
  
  try {
    const dateObj = typeof date === "string" || typeof date === "number" 
      ? new Date(date) 
      : date
    
    if (isNaN(dateObj.getTime())) return ""
    
    return dateFnsFormat(dateObj, format)
  } catch {
    return ""
  }
}

/** Parse API timestamps that are stored/sent as UTC. */
export function parseUtcDate(value: unknown): Date | null {
  const raw = String(value ?? "").trim()
  if (!raw) return null

  const iso = new Date(raw)
  if (!Number.isNaN(iso.getTime()) && /[zZ]|[+-]\d{2}:\d{2}$/.test(raw)) {
    return iso
  }

  const custom = raw.match(
    /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
  )
  if (custom) {
    const day = Number(custom[1])
    const month = Number(custom[2])
    const year = Number(custom[3])
    let hour = Number(custom[4])
    const minute = Number(custom[5])
    const ampm = String(custom[6]).toUpperCase()

    if (ampm === "PM" && hour < 12) hour += 12
    if (ampm === "AM" && hour === 12) hour = 0

    const utc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0))
    return Number.isNaN(utc.getTime()) ? null : utc
  }

  if (!Number.isNaN(iso.getTime())) return iso

  return null
}

export function formatUtcToLocalDateTime(
  value: unknown,
  format: string = "MMM d, yyyy h:mm a",
): string {
  const date = parseUtcDate(value)
  if (!date) return ""
  return formatDate(date, format)
}

export function formatVolume(volume: number): string {
  if (!volume && volume !== 0) return "0";

  if (volume >= 1000000) {
    const millions = volume / 1000000;
    return `${millions.toFixed(millions % 1 === 0 ? 0 : 1)}M`;
  }

  if (volume >= 10000) {
    const thousands = volume / 1000;
    return `${thousands.toFixed(thousands % 1 === 0 ? 0 : 1)}K`;
  }

  return volume.toLocaleString();
}

export function formatPeriodRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): string {
  if (!startDate || !endDate) return ""
  
  try {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return ""
    
    const startFormatted = dateFnsFormat(start, "do MMM")
    const endFormatted = dateFnsFormat(end, "do MMM")
    
    return `${startFormatted} - ${endFormatted}`
  } catch {
    return ""
  }
}

