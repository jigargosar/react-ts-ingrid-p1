import { useEffect } from 'react'
import isHotkey from 'is-hotkey'

type HotKeyMap = {
  key: string | string[]
  handler: (e: KeyboardEvent | void) => void
}[]

export function useWindowIsHotKey(km: HotKeyMap) {
  useEffect(() => {
    function kdl(e: KeyboardEvent) {
      km.forEach(({ key, handler }) => {
        if (isHotkey(key, e)) {
          e.preventDefault()
          handler()
        }
      })
    }

    window.addEventListener('keydown', kdl)
    return () => {
      window.removeEventListener('keydown', kdl)
    }
  }, [])
}
