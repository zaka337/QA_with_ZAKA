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

interface ChatMessage {
  role: string;
  content: string;
}

async function tryGroq(apiKey: string, messages: ChatMessage[]): Promise<string> {
  // This account's available models were confirmed directly against Groq's
  // /models endpoint — llama-3.3-70b-versatile is not on this account's
  // list; openai/gpt-oss-120b is the best general-purpose chat model it
  // actually has access to.
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'openai/gpt-oss-120b', messages }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`Groq: ${errorData.error?.message || res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function tryOpenAI(apiKey: string, messages: ChatMessage[]): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`OpenAI: ${errorData.error?.message || res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// Last-resort fallback only, so losing multi-turn context here (Gemini's
// current simple-text endpoint takes one input string, not a turn array)
// is an acceptable tradeoff versus the primary Groq/OpenAI paths above.
async function tryGemini(apiKey: string, systemPrompt: string, messages: ChatMessage[]): Promise<string> {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      model: 'gemini-3.8-flash',
      system_instruction: systemPrompt,
      input: lastUserMessage,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`Gemini: ${errorData.error?.message || res.status}`);
  }
  const data = await res.json();
  // Response is a "steps" array (e.g. a "thought" step, then a
  // "model_output" step) rather than the older candidates[].content.parts
  // shape — the actual reply text lives in the last model_output step.
  type GeminiStep = { type: string; content?: { type: string; text?: string }[] };
  const steps: GeminiStep[] = data.steps ?? [];
  const outputStep = [...steps].reverse().find((s) => s.type === 'model_output');
  const textBlock = outputStep?.content?.find((c) => c.type === 'text');
  return textBlock?.text ?? '';
}

Deno.serve(async (req) => {
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

    const formattedHistory: ChatMessage[] = history.map(
      (h: { role: string; content?: string; parts?: { text: string }[] }) => ({
        role: h.role === 'model' || h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content || h.parts?.[0]?.text || '',
      })
    );

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...formattedHistory,
      { role: 'user', content: message },
    ];

    // Try each configured provider in order so one provider having a
    // billing/outage issue (as Groq did) doesn't take the whole feature
    // down — falls through to the next until one succeeds.
    const providers: { name: string; run: () => Promise<string> }[] = [];

    const groqKey = Deno.env.get('GROQ_API_KEY');
    if (groqKey) providers.push({ name: 'Groq', run: () => tryGroq(groqKey, messages) });

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (geminiKey) providers.push({ name: 'Gemini', run: () => tryGemini(geminiKey, SYSTEM_PROMPT, messages) });

    // Last in line — this account's OpenAI billing is confirmed inactive
    // right now, so it'll fail fast every time until that's fixed. Left in
    // the chain so it starts working again automatically once it is.
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (openaiKey) providers.push({ name: 'OpenAI', run: () => tryOpenAI(openaiKey, messages) });

    if (providers.length === 0) {
      return new Response(JSON.stringify({ error: 'No AI provider configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const errors: string[] = [];
    for (const provider of providers) {
      try {
        const reply = await provider.run();
        return new Response(JSON.stringify({ reply, provider: provider.name }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`${provider.name} failed:`, msg);
        errors.push(`${provider.name}: ${msg}`);
      }
    }

    throw new Error(`All AI providers failed — ${errors.join(' | ')}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
