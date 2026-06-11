export function normalizeUsPhoneToE164(phone: string | null | undefined) {
  if (!phone) return null

  const text = String(phone).trim()
  if (!text) return null

  const digits = text.replace(/\D/g, "")
  const nationalNumber = digits.length === 11 && digits.startsWith("1")
    ? digits.slice(1)
    : digits

  if (nationalNumber.length !== 10) {
    return null
  }

  return `+1${nationalNumber}`
}

export function isValidUsPhone(phone: string | null | undefined) {
  if (!phone) return true
  return Boolean(normalizeUsPhoneToE164(phone))
}
