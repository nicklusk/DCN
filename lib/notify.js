import { Resend } from 'resend'
import twilio from 'twilio'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function notifyGiver({ giver, cable, claimer }) {
  const promises = []

  // Email notification
  if (giver.notify_email && giver.email) {
    promises.push(
      resend.emails.send({
        from: 'Dollar Cable Neighbor <onboarding@resend.dev>',
        // from: 'Dollar Cable Neighbor <noreply@dollarcableneighbor.com>',
        to: giver.email,
        subject: `Someone reserved your ${cable.cable_type}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#2a7c4f;font-weight:500;margin-bottom:16px">
              Cable reserved!
            </h2>
            <p style="color:#444;line-height:1.6;margin-bottom:16px">
              Hi ${giver.full_name},
            </p>
            <p style="color:#444;line-height:1.6;margin-bottom:16px">
              <strong>${claimer.full_name}</strong> has reserved your 
              <strong>${cable.cable_type}</strong> on Dollar Cable Neighbor.
            </p>
            <p style="color:#444;line-height:1.6;margin-bottom:24px">
              Log in to message them and arrange a pickup. Once you've handed 
              it off, confirm the transaction so the $1 is processed. You have 
              72 hours before the reservation auto-cancels.
            </p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/my-cables"
               style="display:inline-block;background:#2a7c4f;color:#fff;
                      padding:12px 24px;border-radius:8px;text-decoration:none;
                      font-weight:500">
              View your cables →
            </a>
            <p style="color:#aaa;font-size:12px;margin-top:32px">
              Dollar Cable Neighbor
            </p>
          </div>
        `,
      }).catch(err => console.error('Email error:', err))
    )
  }

  // SMS notification
  if (giver.notify_sms && giver.phone) {
    try {
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      )
      promises.push(
        client.messages.create({
          body: `Dollar Cable Neighbor: ${claimer.full_name} reserved your ${cable.cable_type}. Open the app to confirm the handoff. ${process.env.NEXT_PUBLIC_APP_URL}/my-cables`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: giver.phone,
        }).catch(err => console.error('SMS error:', err))
      )
    } catch (err) {
      console.error('Twilio init error:', err)
    }
  }

  await Promise.allSettled(promises)
}