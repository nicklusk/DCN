import { Resend } from 'resend'
import twilio from 'twilio'

const resend = new Resend(process.env.RESEND_API_KEY)

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export async function notifyGiver({ giver, cable, claimer }) {
  const message = `${claimer.full_name} has reserved your ${cable.cable_type}. Open Dollar Cable Neighbor to confirm the handoff.`
  const subject = `Someone reserved your ${cable.cable_type}`
  const body = `
    <p>Hi ${giver.full_name},</p>
    <p><strong>${claimer.full_name}</strong> has reserved your <strong>${cable.cable_type}</strong> on Dollar Cable Neighbor.</p>
    <p>Log in to your account to message them and arrange a pickup. Once you've handed it off, confirm the transaction so the $1 is processed.</p>
    <p>You have 72 hours before the reservation auto-cancels.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/my-cables" 
       style="display:inline-block;background:#2a7c4f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500;margin-top:16px">
      View your cables →
    </a>
    <p style="margin-top:24px;font-size:13px;color:#888">Dollar Cable Neighbor</p>
  `

  const promises = []

  if (giver.notify_email && giver.email) {
    promises.push(
      resend.emails.send({
        from: 'Dollar Cable Neighbor <noreply@dollarcableneighbor.com>',
        to: giver.email,
        subject,
        html: body,
      })
    )
  }

  if (giver.notify_sms && giver.phone) {
    promises.push(
      twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: giver.phone,
      })
    )
  }

  await Promise.allSettled(promises)
}