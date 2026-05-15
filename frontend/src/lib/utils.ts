import type { ApiGroup, JsonValue } from '../types'

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(value?: string) {
  if (!value) {
    return 'Not available'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Not available'
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(value?: string) {
  if (!value) {
    return 'Not available'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Not available'
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatBytes(size: number) {
  if (size === 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1)
  const value = size / 1024 ** index

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value)
}

export function formatDuration(value: number) {
  if (value < 1000) {
    return `${value} ms`
  }

  return `${(value / 1000).toFixed(2)} s`
}

export function formatPlanPrice(priceUsd?: number | null, intervalLabel?: string | null) {
  if (priceUsd == null) {
    return 'Custom'
  }

  if (!intervalLabel) {
    return `$${priceUsd}`
  }

  return `$${priceUsd}/${intervalLabel}`
}

export function maskApiKey(apiKey?: string | null) {
  if (!apiKey) {
    return 'Not issued'
  }

  if (apiKey.length <= 12) {
    return `${apiKey.slice(0, 4)}...`
  }

  return `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`
}

export function stringifyJson(value: JsonValue) {
  return JSON.stringify(value, null, 2)
}

export function getGroupStatus(group: ApiGroup) {
  return group.is_active === false ? 'Inactive' : 'Active'
}

export function getHistoryTone(statusCode: number): 'danger' | 'warning' | 'success' {
  if (statusCode >= 500) {
    return 'danger'
  }

  if (statusCode >= 400) {
    return 'warning'
  }

  return 'success'
}
