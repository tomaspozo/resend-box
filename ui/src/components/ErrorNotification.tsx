import { X } from 'lucide-react'
import { Button } from './ui/button'

interface ErrorNotificationProps {
  message: string
  onDismiss?: () => void
  className?: string
}

export const ErrorNotification = ({
  message,
  onDismiss,
  className = '',
}: ErrorNotificationProps) => {
  return (
    <div
      className={`fixed bottom-4 right-4 bg-red-600 dark:bg-red-700 text-white px-4 py-3 rounded-lg shadow-lg max-w-md z-50 flex items-start gap-3 ${className}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-relaxed">{message}</p>
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-white hover:bg-red-700 dark:hover:bg-red-800 hover:text-white flex-shrink-0"
          onClick={onDismiss}
          aria-label="Dismiss error"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
