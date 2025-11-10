// Generate a unique ID
export function generateId(options?: { length?: number }): string {
  const length = options?.length || 9;
  return `${Date.now()}-${Math.random().toString(36).substr(2, length)}`
}

