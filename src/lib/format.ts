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

