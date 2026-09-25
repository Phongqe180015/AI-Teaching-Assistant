// Helper for real-time notification events across components and browser tabs

const NOTIF_CHANNEL_NAME = 'aita_notification_events'
const CUSTOM_EVENT_NAME = 'aita_notification_update'

export function emitNotificationEvent() {
  try {
    const channel = new BroadcastChannel(NOTIF_CHANNEL_NAME)
    channel.postMessage({ type: 'UPDATE', timestamp: Date.now() })
    channel.close()
  } catch (e) {}

  try {
    window.dispatchEvent(new CustomEvent(CUSTOM_EVENT_NAME, { detail: { timestamp: Date.now() } }))
  } catch (e) {}
}

export function subscribeNotificationEvents(onUpdate: () => void): () => void {
  let channel: BroadcastChannel | null = null

  try {
    channel = new BroadcastChannel(NOTIF_CHANNEL_NAME)
    channel.onmessage = () => onUpdate()
  } catch (e) {}

  const handleCustomEvent = () => onUpdate()
  window.addEventListener(CUSTOM_EVENT_NAME, handleCustomEvent)

  let lastFetchTime = Date.now()
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && Date.now() - lastFetchTime > 15000) {
      lastFetchTime = Date.now()
      onUpdate()
    }
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)

  return () => {
    if (channel) {
      channel.close()
    }
    window.removeEventListener(CUSTOM_EVENT_NAME, handleCustomEvent)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}
