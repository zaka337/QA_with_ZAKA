import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { lesson_id } = await req.json()

    if (!lesson_id) {
      return new Response(JSON.stringify({ error: 'Missing lesson_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Initialize Supabase client representing the USER making the request
    const authHeader = req.headers.get('Authorization')!
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get the user to ensure the token is valid
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Fetch the lesson to find out which course it belongs to
    // (This works because the 'lessons' table is readable by everyone)
    const { data: lesson, error: lessonError } = await supabaseUserClient
      .from('lessons')
      .select('course_id')
      .eq('id', lesson_id)
      .single()

    if (lessonError || !lesson) {
      return new Response(JSON.stringify({ error: 'Lesson not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Verify Enrollment! 
    // RLS ensures the user can ONLY query their own enrollments.
    const { data: enrollment, error: enrollmentError } = await supabaseUserClient
      .from('enrollments')
      .select('id')
      .eq('course_id', lesson.course_id)
      .limit(1)

    if (enrollmentError || !enrollment || enrollment.length === 0) {
      return new Response(JSON.stringify({ error: 'Access Denied: You are not enrolled in this course.' }), {
        status: 403, // 403 Forbidden
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Generate the Signed URL
    // We use the Service Role key here to bypass Storage RLS and act as the system admin.
    const supabaseAdminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const filePath = `${lesson.course_id}/${lesson_id}.mp4`

    // Generate a URL that expires in 15 minutes (900 seconds)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdminClient
      .storage
      .from('videos')
      .createSignedUrl(filePath, 900)

    if (signedUrlError || !signedUrlData) {
      return new Response(JSON.stringify({ error: 'Failed to generate secure video link.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ signedUrl: signedUrlData.signedUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
