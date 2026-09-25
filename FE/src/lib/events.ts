import { useEffect } from 'react'

const EVENT_NAME = 'aita-assignment-changed'
const CHANNEL_NAME = 'aita-channel'

export function notifyAssignmentChanged() {
  if (typeof window !== 'undefined') {
    // 1. In-tab event
    window.dispatchEvent(new CustomEvent(EVENT_NAME))

    // 2. Cross-tab event
    try {
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel(CHANNEL_NAME)
        channel.postMessage({ type: EVENT_NAME, timestamp: Date.now() })
        channel.close()
      }
    } catch (e) {
      console.warn('BroadcastChannel error:', e)
    }
  }
}

export function useAssignmentListener(onChanged: () => void) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Handler for local custom event
    const handleLocalEvent = () => onChanged()

    window.addEventListener(EVENT_NAME, handleLocalEvent)

    // Handler for cross-tab BroadcastChannel
    let channel: BroadcastChannel | null = null
    try {
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel(CHANNEL_NAME)
        channel.onmessage = (event) => {
          if (event.data?.type === EVENT_NAME) {
            onChanged()
          }
        }
      }
    } catch (e) {
      console.warn('BroadcastChannel init error:', e)
    }

    return () => {
      window.removeEventListener(EVENT_NAME, handleLocalEvent)
      if (channel) channel.close()
    }
  }, [onChanged])
}
