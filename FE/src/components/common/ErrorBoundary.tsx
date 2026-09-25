import React from 'react'
import { AlertCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
  hasError: boolean
}

// Split out so the fallback can use hooks: the boundary itself must stay a class
// component, but the message still has to follow the language switch.
function DefaultErrorFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-center min-h-[400px] bg-red-50 p-4">
      <div className="max-w-md text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-600 mb-4" />
        <h2 className="text-lg font-semibold text-red-900 mb-2">{t('ui.error_generic')}</h2>
        <p className="text-sm text-red-700 mb-4">{error.message}</p>
        <button
          onClick={onReset}
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          {t('ui.try_again')}
        </button>
      </div>
    </div>
  )
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null, hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    console.error('Error caught by boundary:', error)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback ? (
        this.props.fallback(this.state.error, this.reset)
      ) : (
        <DefaultErrorFallback error={this.state.error} onReset={this.reset} />
      )
    }

    return this.props.children
  }
}
