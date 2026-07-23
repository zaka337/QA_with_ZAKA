import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import gsap from 'gsap';

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
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is not configured in .env');

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const history = messages.slice(1).map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      }));

      const contents = [
        ...history,
        { role: 'user', parts: [{ text: userMessage }] },
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        config: { systemInstruction: SYSTEM_PROMPT },
        contents,
      });

      const responseText = response.text ?? '';
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
                    {msg.content}
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
