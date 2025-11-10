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

