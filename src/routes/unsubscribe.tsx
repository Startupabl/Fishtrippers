import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/unsubscribe')({
  component: UnsubscribePage,
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === 'string' ? s.token : '',
  }),
})

type State =
  | { kind: 'loading' }
  | { kind: 'invalid' }
  | { kind: 'already' }
  | { kind: 'ready'; email: string }
  | { kind: 'success' }
  | { kind: 'error'; msg: string }

function UnsubscribePage() {
  const { token } = Route.useSearch()
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    if (!token) {
      setState({ kind: 'invalid' })
      return
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok || body?.valid === false) {
          if (body?.reason === 'already_used') setState({ kind: 'already' })
          else setState({ kind: 'invalid' })
          return
        }
        setState({ kind: 'ready', email: body?.email ?? '' })
      })
      .catch(() => setState({ kind: 'invalid' }))
  }, [token])

  async function confirm() {
    setState({ kind: 'loading' })
    try {
      const r = await fetch('/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!r.ok) throw new Error('Failed')
      setState({ kind: 'success' })
    } catch (e) {
      setState({ kind: 'error', msg: 'Could not unsubscribe. Try again later.' })
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <h1 className="mb-4 text-2xl font-semibold">Email preferences</h1>
      {state.kind === 'loading' && (
        <p className="text-muted-foreground">Checking your link…</p>
      )}
      {state.kind === 'invalid' && (
        <p className="text-muted-foreground">
          This unsubscribe link is invalid or has expired.
        </p>
      )}
      {state.kind === 'already' && (
        <p className="text-muted-foreground">
          You're already unsubscribed. No further emails will be sent.
        </p>
      )}
      {state.kind === 'ready' && (
        <div className="space-y-4">
          <p>
            Unsubscribe <strong>{state.email}</strong> from Fishtrippers emails?
          </p>
          <button
            onClick={confirm}
            className="rounded-md bg-primary px-5 py-2 text-primary-foreground hover:opacity-90"
          >
            Confirm unsubscribe
          </button>
        </div>
      )}
      {state.kind === 'success' && (
        <p>You've been unsubscribed. Sorry to see you go.</p>
      )}
      {state.kind === 'error' && (
        <p className="text-destructive">{state.msg}</p>
      )}
    </div>
  )
}
