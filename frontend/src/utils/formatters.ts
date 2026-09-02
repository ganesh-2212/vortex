/**
 * Utility functions for globally consistent financial and numeric formatting.
 */

/**
 * Format a number into standard Indian Currency format (e.g. ₹1,25,000.00 or ₹1,25,000)
 * Uses Indian numbering system grouping (lakhs, crores).
 * Does not add unnecessary .00 decimals unless explicitly present.
 */
export const formatCurrency = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined) return '₹0'
  
  const num = Number(val)
  if (isNaN(num)) return '₹0'
  if (num === 0) return '₹0'

  const hasDecimals = num % 1 !== 0

  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  })}`
}

/**
 * Format a number into a compact Indian Currency format suitable for KPI cards.
 * Uses K (thousands), L (lakhs), Cr (crores).
 * Example: 1250000 -> ₹12.5L
 */
export const formatCompactCurrency = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined) return '₹0'
  
  const num = Number(val)
  if (isNaN(num)) return '₹0'
  if (num === 0) return '₹0'

  const absNum = Math.abs(num)
  const sign = num < 0 ? '-' : ''

  if (absNum >= 10000000) { // >= 1 Crore
    return `₹${sign}${(absNum / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2 })}Cr`
  }
  
  if (absNum >= 100000) { // >= 1 Lakh
    return `₹${sign}${(absNum / 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 })}L`
  }
  
  if (absNum >= 1000) { // >= 1 Thousand
    return `₹${sign}${(absNum / 1000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}K`
  }

  return formatCurrency(val)
}

/**
 * Format a percentage, removing unnecessary decimal zeros.
 * Example: 100 -> 100%, 65.5 -> 65.5%
 */
export const formatPercentage = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined) return '0%'
  
  const num = Number(val)
  if (isNaN(num)) return '0%'
  if (num === 0) return '0%'

  // If integer, don't show decimal. If fractional, show up to 1 decimal place.
  const hasDecimals = num % 1 !== 0

  return `${num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: hasDecimals ? 1 : 0
  })}%`
}

/**
 * Format normal integer numbers like scores, counts, priorities.
 * Examples: 0, 1, 65, 100
 */
export const formatNumber = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined) return '0'
  
  const num = Number(val)
  if (isNaN(num)) return '0'
  
  // Return just the rounded integer for counts/scores
  return Math.round(num).toString()
}
