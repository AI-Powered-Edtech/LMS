import { useEffect, useState, useRef } from 'react'

/**
 * Custom hook that debounces a value by a specified delay.
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @param leading - If true, fires immediately on first call (default: false)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300, leading: boolean = false): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  const isFirstCall = useRef(true)

  useEffect(() => {
    if (leading && isFirstCall.current) {
      setDebouncedValue(value)
      isFirstCall.current = false
      return
    }

    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay, leading])

  return debouncedValue
}
