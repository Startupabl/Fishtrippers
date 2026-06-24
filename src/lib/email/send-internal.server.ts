// Server-only helper to enqueue a transactional email from inside a server function.
// Mirrors the render + enqueue logic of /lovable/email/transactional/send so we
// don't need to make an internal HTTP call from another server fn.

import * as React from 'react'
import { render } from '@react-email/components'
import { TEMPLATES } from '@/lib/email-templates/registry'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

const SITE_NAME = 'Fishtrippers'
const SENDER_DOMAIN = 'notify.fishtrippers.com'
const FROM_DOMAIN = 'fishtrippers.com'

interface SendArgs {
  templateName: string
  recipientEmail: string
  idempotencyKey?: string
  templateData?: Record<string, any>
}

export async function sendTransactionalEmailInternal({
  templateName,
  recipientEmail,
  idempotencyKey,
  templateData = {},
}: SendArgs): Promise<{ ok: boolean; reason?: string }> {
  const template = TEMPLATES[templateName]
  if (!template) {
    console.error('[email] template not found', { templateName })
    return { ok: false, reason: 'template_not_found' }
  }

  const effectiveRecipient = template.to || recipientEmail
  if (!effectiveRecipient) {
    return { ok: false, reason: 'no_recipient' }
  }
  const normalizedEmail = effectiveRecipient.toLowerCase()
  const messageId = crypto.randomUUID()
  const idemKey = idempotencyKey || messageId

  // Suppression check
  const { data: suppressed } = await supabaseAdmin
    .from('suppressed_emails')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()
  if (suppressed) {
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'suppressed',
    } as never)
    return { ok: false, reason: 'suppressed' }
  }

  // Ensure unsubscribe token
  let { data: tokenRow } = await supabaseAdmin
    .from('email_unsubscribe_tokens')
    .select('token, used_at' as never)
    .eq('email', normalizedEmail)
    .maybeSingle()
  let unsubscribeToken = (tokenRow as any)?.token as string | undefined
  if (!unsubscribeToken) {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    const newToken = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
    await supabaseAdmin
      .from('email_unsubscribe_tokens')
      .upsert({ email: normalizedEmail, token: newToken } as never, { onConflict: 'email' })
    const { data: re } = await supabaseAdmin
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', normalizedEmail)
      .maybeSingle()
    unsubscribeToken = (re as any)?.token
  }

  // Render
  const element = React.createElement(template.component, templateData)
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject =
    typeof template.subject === 'function' ? template.subject(templateData) : template.subject

  await supabaseAdmin.from('email_send_log').insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: effectiveRecipient,
    status: 'pending',
  } as never)

  const { error: enqueueError } = await supabaseAdmin.rpc('enqueue_email' as never, {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: effectiveRecipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: templateName,
      idempotency_key: idemKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  } as never)

  if (enqueueError) {
    console.error('[email] enqueue failed', enqueueError)
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'enqueue failed',
    } as never)
    return { ok: false, reason: 'enqueue_failed' }
  }

  return { ok: true }
}
