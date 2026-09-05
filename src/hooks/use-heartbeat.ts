import { useEffect, useRef } from 'react'
import { useTerminalStore } from '../store/terminal-store'

export function useHeartbeat(intervalMs = 30_000) {
  const registered = useTerminalStore((s) => s.registered)
  const sendHeartbeat = useTerminalStore((s) => s.sendHeartbeat)
  const heartbeatRef = useRef(sendHeartbeat)
  heartbeatRef.current = sendHeartbeat

  useEffect(() => {
    if (!registered) return

    // Send one immediately on mount
    heartbeatRef.current()

    const timer = setInterval(() => {
      heartbeatRef.current()
    }, intervalMs)

    return () => clearInterval(timer)
  }, [registered, intervalMs])
}
