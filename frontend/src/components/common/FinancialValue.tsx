import React from 'react'

export type FinancialSize = 'hero' | 'overview-kpi' | 'metric' | 'table' | 'body'

interface FinancialValueProps {
  value: React.ReactNode
  size?: FinancialSize
  className?: string
}

export function FinancialValue({ value, size = 'metric', className = '' }: FinancialValueProps) {
  let baseClass = 'font-sans '
  
  if (size === 'hero') {
    // Proportional numerals for elegant display in large sizes
    baseClass += 'proportional-nums tracking-tight font-bold text-3xl md:text-5xl '
  } else if (size === 'overview-kpi') {
    // Proportional numerals specifically tuned for Overview dashboard cards (approx 30px)
    baseClass += 'proportional-nums tracking-tight font-bold text-2xl md:text-3xl '
  } else if (size === 'metric') {
    // Proportional numerals for medium KPIs
    baseClass += 'proportional-nums tracking-tight font-bold text-xl '
  } else if (size === 'table') {
    // Tabular numerals for table column alignment
    baseClass += 'tabular-nums font-semibold text-[13px] '
  } else if (size === 'body') {
    // Normal text size but tabular for consistency
    baseClass += 'tabular-nums font-medium text-[13px] '
  }

  return (
    <span className={`${baseClass} ${className}`.trim()}>
      {value}
    </span>
  )
}
