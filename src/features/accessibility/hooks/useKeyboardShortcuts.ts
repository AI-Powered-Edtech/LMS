import { useEffect, useRef } from 'react'

type ShortcutHandler = (e: KeyboardEvent) => void

export interface Shortcut {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  meta?: boolean
  handler: ShortcutHandler
  description?: string
}

export function useKeyboardShortcut(shortcut: Shortcut) {
  const handlerRef = useRef(shortcut.handler)
  handlerRef.current = shortcut.handler

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const keyMatch = e.key === shortcut.key || e.key.toLowerCase() === shortcut.key.toLowerCase()
      if (!keyMatch) return

      const ctrlOk =
        shortcut.ctrl === undefined
          ? true
          : shortcut.ctrl
            ? e.ctrlKey || e.metaKey
            : !e.ctrlKey && !e.metaKey
      const altOk = shortcut.alt === undefined ? true : shortcut.alt ? e.altKey : !e.altKey
      const shiftOk =
        shortcut.shift === undefined ? true : shortcut.shift ? e.shiftKey : !e.shiftKey

      if (ctrlOk && altOk && shiftOk) {
        handlerRef.current(e)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [shortcut.key, shortcut.ctrl, shortcut.alt, shortcut.shift])
}
