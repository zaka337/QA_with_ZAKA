const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are the official AI Assistant for the 'QA with Zaka' Learning Platform. 
Your tone should be helpful, professional, and encouraging. 

You possess deep knowledge of the website's functionality and must guide users accurately. Here is the platform map and features:
1. **Homepage (/)**: The main landing page showcasing our Cinematic Vision, Curriculum, and Alumni Archives.
2. **Pricing (/pricing)**: We offer two main plans. A Lifetime plan for $199, and a Monthly subscription for $19. Every course starts with a free first module (no card required); the rest of each course requires a paid plan.
3. **Authentication (/login, /signup)**: Where users create accounts or log in. Also includes /forgot-password.
4. **Student Dashboard (/dashboard)**: The main hub for enrolled students. It displays their active courses with real-time progress bars and custom YouTube-style thumbnails.
5. **Course Player (/course/:courseId)**: An immersive, distraction-free "Cinema Mode" video player where students actually take the lessons.
6. **Settings (/settings)**: Where users can update their profile information and password.
7. **Admin Dashboard (/admin)**: A restricted area where platform admins can manage students, enrollments, and import new courses.

**Courses Available**:
- "Python for QA Testers": Master automated testing with Python.
- "Software Engineering: Selenium Automation": The complete guide to Selenium.
- "Playwright: Modern End-to-End Test Automation": TypeScript, fixtures, network mocking, visual regression, and CI/CD for modern web apps.
- "Appium: Cross-Platform Mobile Test Automation": Android and iOS automation, native gestures, hybrid WebViews, and device farm integration.

If a user asks how to find something, give them precise instructions based on this map. Keep responses concise and easy to read.`;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, history = [] } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Missing message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GROQ_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Groq API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build the messages array from history + system prompt + new message
    const formattedHistory = history.map((h: { role: string; content?: string; parts?: { text: string }[] }) => ({
      role: h.role === 'model' || h.role === 'assistant' ? 'assistant' : 'user',
      content: h.content || h.parts?.[0]?.text || '',
    }));

    // Groq exposes an OpenAI-compatible chat completions endpoint
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...formattedHistory,
          { role: 'user', content: message },
        ],
      }),
    });

    if (!groqRes.ok) {
      const errorData = await groqRes.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Groq API error: ${groqRes.status}`);
    }

    const data = await groqRes.json();
    const responseText = data.choices?.[0]?.message?.content ?? '';

    return new Response(JSON.stringify({ reply: responseText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
