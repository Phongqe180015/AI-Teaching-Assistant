import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface LoadingSpinnerProps {
  fullScreen?: boolean
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
}

/**
 * Loading spinner component
 */
export function LoadingSpinner({
  fullScreen = false,
  size = 'md',
  text
}: LoadingSpinnerProps) {
  const { t } = useTranslation()
  // Only default when the caller omitted the prop — text="" still hides the label.
  const label = text === undefined ? t('ui.loading') : text
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      {label && <p className="text-sm text-gray-600">{label}</p>}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-50">
        {content}
      </div>
    )
  }

  return <div className="flex items-center justify-center py-12">{content}</div>
}

/**
 * Loading skeleton - placeholder while data loads
 */
export function SkeletonLoader({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-gray-200 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}
