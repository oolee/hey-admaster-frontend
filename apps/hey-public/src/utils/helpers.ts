export function validateImageSize(width: number, height: number): {
  valid: boolean
  message?: string
} {
  if (width > 3840 || height > 3840)
    return { valid: false, message: '单边最大不超过 3840px' }
  if (width % 16 !== 0 || height % 16 !== 0)
    return { valid: false, message: '宽高必须为 16px 的倍数' }
  const ratio = Math.max(width, height) / Math.min(width, height)
  if (ratio > 3)
    return { valid: false, message: '长宽比不超过 3:1' }
  return { valid: true }
}

export function formatPrice(price: number, currency: string = 'CNY'): string {
  if (currency === 'CNY') return `¥${price.toLocaleString()}`
  return `$${price.toLocaleString()}`
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}