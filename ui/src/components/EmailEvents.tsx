import { Send, CheckCircle } from 'lucide-react'

interface EmailEventsProps {
  createdAt: number
}

const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const month = date.toLocaleString('default', { month: 'short' })
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  const displayMinutes = minutes.toString().padStart(2, '0')
  return `${month} ${day}, ${displayHours}:${displayMinutes} ${ampm}`
}

export const EmailEvents = ({ createdAt }: EmailEventsProps) => {
  return (
    <div className="border-b p-6 bg-muted/30 relative">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0',
        }}
      />
      <div className="relative">
        <h2 className="text-sm font-medium text-muted-foreground mb-2">
          EMAIL EVENTS
        </h2>
        <div className="flex items-center justify-center gap-8">
          {/* Sent Event */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-muted border-2 border-border flex items-center justify-center">
              <Send className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Sent</div>
              <div className="text-xs">{formatDateTime(createdAt)}</div>
            </div>
          </div>

          {/* Connection Line */}
          <div className="flex-1 max-w-90 h-0.5 border-t-2 border-dashed border-border"></div>

          {/* Delivered Event */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-green-600 dark:bg-green-500 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div className="text-center">
              <div className="text-sm text-green-600 dark:text-green-500 font-medium">
                Delivered
              </div>
              <div className="text-xs">{formatDateTime(createdAt)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
