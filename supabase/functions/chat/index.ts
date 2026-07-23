import { GoogleGenAI } from 'npm:@google/genai@^1.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are the official AI Assistant for the 'QA with Zaka' Learning Platform. 
Your tone should be helpful, professional, and encouraging. 

You possess deep knowledge of the website's functionality and must guide users accurately. Here is the platform map and features:
1. **Homepage (/)**: The main landing page showcasing our Cinematic Vision, Curriculum, and Alumni Archives.
2. **Pricing (/pricing)**: We offer two main plans. A Lifetime plan for $199, and a Monthly subscription for $49.
3. **Authentication (/login, /signup)**: Where users create accounts or log in. Also includes /forgot-password.
4. **Student Dashboard (/dashboard)**: The main hub for enrolled students. It displays their active courses with real-time progress bars and custom YouTube-style thumbnails.
5. **Course Player (/course/:courseId)**: An immersive, distraction-free "Cinema Mode" video player where students actually take the lessons.
6. **Settings (/settings)**: Where users can update their profile information and password.
7. **Admin Dashboard (/admin)**: A restricted area where platform admins can manage students, enrollments, and import new courses.

**Courses Available**:
- "Python for QA Testers": Master automated testing with Python.
- "Software Engineering: Selenium Automation": The complete guide to Selenium.

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

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Gemini API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Build conversation contents from history + new message
    const contents = [
      ...history.map((h: { role: string; parts: { text: string }[] }) => ({
        role: h.role,
        parts: h.parts,
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      config: { systemInstruction: SYSTEM_PROMPT },
      contents,
    });

    const responseText = response.text;

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
