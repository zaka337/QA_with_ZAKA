import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import gsap from 'gsap';
import ReactMarkdown from 'react-markdown';

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

type Message = {
  role: 'user' | 'model';
  content: string;
};

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Hi there! 👋 I'm the platform assistant. How can I help you with your QA automation journey today?" }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const chatRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && chatRef.current) {
      gsap.fromTo(
        chatRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // 1. Try backend Supabase Edge Function first (recommended for production - keeps API key hidden on server)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const openAiKey = (import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY || (import.meta as any).env?.OPENAI_API_KEY) as string | undefined;

      let responseText = '';

      if (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co') {
        try {
          const edgeRes = await fetch(`${supabaseUrl}/functions/v1/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              message: userMessage,
              history: messages.slice(1).map(msg => ({
                role: msg.role === 'model' ? 'assistant' : 'user',
                content: msg.content,
              })),
            }),
          });

          const edgeData = await edgeRes.json().catch(() => ({}));
          if (edgeRes.ok && edgeData.reply) {
            responseText = edgeData.reply;
          } else if (edgeData.error) {
            console.warn('Edge function returned error:', edgeData.error);
          }
        } catch {
          // If Edge function fails or isn't deployed yet, fall through to direct API call
        }
      }

      // 2. Direct OpenAI API call (if Edge function didn't handle it and client API key exists)
      if (!responseText) {
        if (!openAiKey || openAiKey === 'your_openai_api_key_here') {
          throw new Error('OpenAI API key is missing. Please set VITE_OPENAI_API_KEY in .env or configure OPENAI_API_KEY in Supabase Edge Functions.');
        }

        const formattedHistory = messages.slice(1).map(msg => ({
          role: msg.role === 'model' ? 'assistant' : 'user',
          content: msg.content,
        }));

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              ...formattedHistory,
              { role: 'user', content: userMessage },
            ],
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `OpenAI API request failed with status ${res.status}`);
        }

        const data = await res.json();
        responseText = data.choices?.[0]?.message?.content ?? '';
      }

      setMessages(prev => [...prev, { role: 'model', content: responseText }]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Chat Error:', error);
      setMessages(prev => [...prev, { role: 'model', content: `Error: ${message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 sm:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="fixed z-50 bottom-4 right-4 sm:bottom-6 sm:right-6 flex flex-col items-end pointer-events-none">
        {isOpen && (
          <div
            ref={chatRef}
            className="pointer-events-auto mb-3 sm:mb-4 w-[calc(100vw-2rem)] sm:w-[400px] h-[min(520px,calc(100dvh-6rem))] sm:h-[500px] sm:max-h-[70vh] bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden origin-bottom-right"
          >
            <div className="p-4 border-b border-white/10 flex justify-between items-center gap-3 bg-white/[0.02] shrink-0">
              <div className="min-w-0">
                <h3 className="font-eb-garamond text-lg sm:text-xl text-white truncate">AI Assistant</h3>
                <p className="text-xs font-inter text-white/50 truncate">Online and ready to help</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="shrink-0 text-white/50 hover:text-white transition-colors p-1"
                aria-label="Close chat"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-4 min-h-0">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] p-3 rounded-2xl text-sm font-inter break-words ${
                      msg.role === 'user'
                        ? 'bg-white text-black rounded-tr-sm'
                        : 'bg-white/10 text-white/90 rounded-tl-sm border border-white/5'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-white/90">{children}</p>,
                          h1: ({ children }) => <h1 className="text-base font-bold text-amber-400 mt-2 mb-1">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-sm font-bold text-amber-400 mt-2 mb-1">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-bold text-amber-400 mt-1 mb-1">{children}</h3>,
                          strong: ({ children }) => <strong className="font-semibold text-amber-300">{children}</strong>,
                          ul: ({ children }) => <ul className="list-disc list-inside my-1 space-y-1 text-white/90">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside my-1 space-y-1 text-white/90">{children}</ol>,
                          li: ({ children }) => <li className="leading-snug">{children}</li>,
                          code: ({ children }) => (
                            <code className="bg-white/10 text-amber-300 px-1.5 py-0.5 rounded text-xs font-mono">
                              {children}
                            </code>
                          ),
                          a: ({ href, children }) => (
                            <a href={href} className="text-amber-400 underline hover:text-amber-300" target="_blank" rel="noreferrer">
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-sm p-3">
                    <Loader2 size={16} className="text-white/50 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 sm:p-4 border-t border-white/10 bg-white/[0.01] shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2 min-w-0">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask me anything..."
                  className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="shrink-0 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                  aria-label="Send message"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        )}

        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="pointer-events-auto self-end w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-lg shadow-white/10 hover:scale-110 active:scale-95 transition-all duration-300"
            aria-label="Open chat"
          >
            <MessageSquare size={24} />
          </button>
        )}
      </div>
    </>
  );
}
