import { useEffect, useRef, useState } from 'react'

export function usePriceFlash(value) {
  const prevRef = useRef(value)
  const [flash, setFlash] = useState(null) // 'up' | 'down' | null

  useEffect(() => {
    if (prevRef.current !== undefined && value !== prevRef.current) {
      setFlash(value > prevRef.current ? 'up' : 'down')
      prevRef.current = value
      const t = setTimeout(() => setFlash(null), 1500)
      return () => clearTimeout(t)
    }
    prevRef.current = value
  }, [value])

  return flash
}
