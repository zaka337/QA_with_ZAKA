import Stripe from 'npm:stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 })
  }

  try {
    const body = await req.text()
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.client_reference_id

      if (!userId) {
        return new Response('No user ID in session', { status: 400 })
      }

      // Determine plan from mode
      const plan = session.mode === 'payment' ? 'lifetime' : 'monthly'

      // Initialize Supabase admin client
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      // Update user plan in profiles
      await supabase
        .from('profiles')
        .update({ plan, updated_at: new Date().toISOString() })
        .eq('id', userId)

      // Enroll user in all published courses
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('is_published', true)

      if (courses) {
        for (const course of courses) {
          await supabase.from('enrollments').upsert(
            { user_id: userId, course_id: course.id, plan },
            { onConflict: 'user_id,course_id' }
          )
        }
      }

      console.log(`✅ Payment processed for user ${userId} — plan: ${plan}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('Webhook error:', err.message)
    return new Response(`Webhook error: ${err.message}`, { status: 400 })
  }
})
