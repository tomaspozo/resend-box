import { useState, useEffect } from 'react'
import { EmailList } from '../components/EmailList'
import { ErrorNotification } from '../components/ErrorNotification'
import { fetchEmails } from '../api'
import type { Email } from '../types'
import { useNavigate } from 'react-router-dom'

export const EmailsListPage = () => {
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const loadEmails = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchEmails()
      setEmails(data)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load emails'
      setError(message)
      console.error('Failed to load emails:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmails()
    // Poll for new emails every 2 seconds
    const interval = setInterval(() => loadEmails(), 2000)
    return () => clearInterval(interval)
  }, [])

  const handleEmailClick = (email: Email) => {
    navigate(`/ui/emails/${email.id}`)
  }

  return (
    <>
      <EmailList
        emails={emails}
        loading={loading}
        onEmailClick={handleEmailClick}
      />
      {error && (
        <ErrorNotification message={error} onDismiss={() => setError(null)} />
      )}
    </>
  )
}
