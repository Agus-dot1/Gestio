'use client'

import { useTheme } from 'next-themes'
import { Switch } from '@/components/ui/switch'

export function ModeToggle() {
  const { setTheme, theme } = useTheme()

  const checked = theme === 'dark'

  return (
    <Switch
      id="theme-dark-mode"
      checked={checked}
      onCheckedChange={(on) => setTheme(on ? 'dark' : 'light')}
    />
  )
}
