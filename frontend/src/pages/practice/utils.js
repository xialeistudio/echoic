export const SPEEDS = [0.5, 1, 1.5, 2]

export const rowBtnCls = 'h-full w-full flex items-center justify-center rounded-none text-muted-foreground hover:text-foreground'

export function formatTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

export function scoreColor(score) {
  if (score >= 80) return 'text-green-500'
  if (score >= 50) return 'text-yellow-500'
  return 'text-red-500'
}

export function chipBg(score) {
  if (score >= 80) return 'bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
  if (score >= 50) return 'bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700'
  return 'bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
}
