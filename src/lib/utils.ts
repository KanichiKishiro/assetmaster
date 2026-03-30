import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatJpy(value: number): string {
  return value.toLocaleString('ja-JP') + '円'
}

export function formatNumber(value: number): string {
  return value.toLocaleString('ja-JP')
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '/')
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatDiff(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toLocaleString('ja-JP')}円`
}

export function currentMonth(): number {
  return new Date().getMonth() + 1
}
