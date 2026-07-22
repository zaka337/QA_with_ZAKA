import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import gsap from 'gsap';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { useAuth } from '../hooks/useAuth';
import {
  getCourseCurriculum,
  getLessonProgress,
  markLessonComplete,
  type Module,
  type Lesson,
  type LessonProgress,
} from '../lib/supabase';
import { LessonContent } from '../components/LessonContent';
import { CodeEditor } from '../components/CodeEditor';

type LogType = 'info' | 'success' | 'error' | 'system';
interface TerminalLog {
  id: string;
  type: LogType;
  message: string;
}

export default function CoursePlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [curriculum, setCurriculum] = useState<Module[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  // For code editor state
  const [, setCodeValue] = useState('');

  // Terminal Execution State
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  /* ── Load curriculum + progress ── */
  useEffect(() => {
    if (!courseId || !user) return;

    const load = async () => {
      const [modules, prog] = await Promise.all([
        getCourseCurriculum(courseId),
        getLessonProgress(user.id, courseId),
      ]);
      setCurriculum(modules);
      setProgress(prog);

      // Set first incomplete lesson as active, or first lesson
      const allLessons = modules.flatMap(m => m.lessons);
      const completedIds = new Set(prog.filter(p => p.completed).map(p => p.lesson_id));
      const firstIncomplete = allLessons.find(l => !completedIds.has(l.id));
      setActiveLesson(firstIncomplete ?? allLessons[0] ?? null);
      setLoading(false);
    };

    load();
  }, [courseId, user]);

  useEffect(() => {
    if (activeLesson) {
      setCodeValue(activeLesson.starter_code || '');
      // Reset terminal when changing lessons
      setIsTerminalOpen(false);
      setTerminalLogs([]);
    }
  }, [activeLesson]);

  useEffect(() => {
    if (loading) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.player-fade-in', { opacity: 0 }, { opacity: 1, duration: 1.5, ease: 'power2.out' });
    }, containerRef);
    return () => ctx.revert();
  }, [loading]);

  /* ── Helpers ── */
  const isCompleted = useCallback(
    (lessonId: string) => progress.some(p => p.lesson_id === lessonId && p.completed),
    [progress]
  );

  const handleMarkComplete = async () => {
    if (!user || !activeLesson || completing) return;
    setCompleting(true);
    const ok = await markLessonComplete(user.id, activeLesson.id);
    if (ok) {
      setProgress(prev => {
        const existing = prev.find(p => p.lesson_id === activeLesson.id);
        if (existing) return prev.map(p => p.lesson_id === activeLesson.id ? { ...p, completed: true } : p);
        return [...prev, { lesson_id: activeLesson.id, completed: true, watched_seconds: 0 }];
      });
      goToNextLesson();
    }
    setCompleting(false);
  };

  const allLessons = curriculum.flatMap(m => m.lessons);
  const activeIndex = activeLesson ? allLessons.findIndex(l => l.id === activeLesson.id) : -1;

  const goToNextLesson = () => {
    if (activeIndex < allLessons.length - 1) {
      setActiveLesson(allLessons[activeIndex + 1]);
    }
  };
  const goToPrevLesson = () => {
    if (activeIndex > 0) {
      setActiveLesson(allLessons[activeIndex - 1]);
    }
  };

  const activeModule = curriculum.find(m => m.lessons.some(l => l.id === activeLesson?.id));

  /* ── Mock Execution Engine ── */
  const runMockExecution = async (code: string) => {
    setIsTerminalOpen(true);
    setIsExecuting(true);
    
    // Initial system log
    setTerminalLogs([{ id: Date.now().toString(), type: 'system', message: '> node main.js' }]);

    const addLog = (msg: string, type: LogType = 'info') => {
      setTerminalLogs(prev => [...prev, { id: Math.random().toString(), type, message: msg }]);
    };

    // Simulate startup delay
    await new Promise(r => setTimeout(r, 600));
    addLog('Initializing Selenium WebDriver...', 'info');
    
    await new Promise(r => setTimeout(r, 1000));

    // Strip single-line and multi-line comments, but require space/start of line for single-line
    // so we don't accidentally strip 'https://...' URLs!
    const cleanCode = code.replace(/\/\*[\s\S]*?\*\/|(?:^|\s)\/\/.*/gm, '');

    // Split logic based on the lesson context!
    const isLoginLesson = activeLesson?.title === 'Automated Login Test';

    if (isLoginLesson) {
      // ── MOCK: Mocha Test Runner Simulation ──
      setTerminalLogs([{ id: Date.now().toString(), type: 'system', message: '> mocha login.spec.js' }]);
      await new Promise(r => setTimeout(r, 400));
      addLog('Running Selenium Test Suite...', 'info');
      await new Promise(r => setTimeout(r, 600));

      const hasFindElement = cleanCode.includes('findElement') || cleanCode.includes('By.id');
      const hasSendKeys = cleanCode.includes('sendKeys');
      const hasClick = cleanCode.includes('click()');

      if (!hasFindElement || !hasSendKeys) {
        addLog('Error: Could not locate username or password fields. Did you forget `findElement` and `sendKeys`?', 'error');
        addLog('✖ 1 failing (800ms)', 'error');
        setIsExecuting(false);
        return;
      }

      addLog('Finding element: username ...', 'system');
      await new Promise(r => setTimeout(r, 400));
      addLog('Sending keys: "testuser" ...', 'system');
      await new Promise(r => setTimeout(r, 400));
      addLog('Finding element: password ...', 'system');
      await new Promise(r => setTimeout(r, 400));
      addLog('Sending keys: "********" ...', 'system');
      await new Promise(r => setTimeout(r, 400));

      if (!hasClick) {
        addLog('Error: Form submission timed out. Did you forget to `click()` the submit button?', 'error');
        addLog('✖ 1 failing (2100ms)', 'error');
        setIsExecuting(false);
        return;
      }

      addLog('Clicking Submit button ...', 'system');
      await new Promise(r => setTimeout(r, 800));

      addLog('✓ User Authentication Test Passed (1420ms)', 'success');
      addLog('  1 passing (1.5s)', 'system');
      
    } else {
      // ── MOCK: Standard Selenium WebDriver Script ──
      setTerminalLogs([{ id: Date.now().toString(), type: 'system', message: '> node main.js' }]);

      await new Promise(r => setTimeout(r, 600));
      addLog('Initializing Selenium WebDriver...', 'info');
      
      await new Promise(r => setTimeout(r, 1000));

      const hasBuilder = cleanCode.includes('Builder().forBrowser(Browser.CHROME)') || cleanCode.includes('new Builder()');
      const hasGet = cleanCode.includes('.get(') || cleanCode.includes('.navigate(');
      const hasGfg = cleanCode.includes('geeksforgeeks.org');

      if (!hasBuilder) {
        addLog('Error: WebDriver Builder not initialized. Did you forget `new Builder().forBrowser(...)`?', 'error');
        addLog('Process exited with code 1.', 'system');
        setIsExecuting(false);
        return;
      }

      addLog('Chrome WebDriver session started successfully.', 'success');
      await new Promise(r => setTimeout(r, 800));

      if (!hasGet || !hasGfg) {
        addLog('Error: Navigation failed. Did you forget to navigate to https://www.geeksforgeeks.org/ ?', 'error');
        addLog('Process exited with code 1.', 'system');
        setIsExecuting(false);
        return;
      }

      addLog('Navigated to: https://www.geeksforgeeks.org/', 'info');
      
      // ILLUSION: Actually pop open a new tab to make it feel incredibly real!
      window.open('https://www.geeksforgeeks.org/', '_blank');
      
      await new Promise(r => setTimeout(r, 600));

      addLog('Execution completed successfully.', 'success');
      addLog('Process exited with code 0.', 'system');
    }
    setIsExecuting(false);

    // Auto-mark as complete if they succeeded!
    if (activeLesson && !isCompleted(activeLesson.id)) {
      handleMarkComplete();
    }
  };
  
  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="loading-text">
          <span>L</span><span>O</span><span>A</span><span>D</span><span>I</span><span>N</span><span>G</span>
        </div>
      </div>
    );
  }

  const hasEditor = !!activeLesson?.starter_code || !!activeLesson?.solution_code;

  return (
    <div ref={containerRef} className="h-screen w-screen bg-black text-white flex overflow-hidden font-inter player-fade-in">

      {/* ── Main Workspace Area ── */}
      <div className="flex-1 flex flex-col relative h-full min-w-0">

        {/* Top Bar */}
        <div className="w-full h-14 sm:h-16 px-4 sm:px-6 flex justify-between items-center z-10 border-b border-white/5 bg-[#0a0a0a] shrink-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs font-geist uppercase tracking-widest text-white/70 hover:text-white transition-colors flex items-center gap-2"
          >
            <span className="text-lg leading-none">&larr;</span>
            <span className="hidden xs:inline">Dashboard</span>
          </button>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-xs font-geist uppercase tracking-widest text-white/70 hover:text-white transition-colors lg:hidden"
          >
            {sidebarOpen ? 'Close' : 'Syllabus'}
          </button>
        </div>

        {/* Active Learning Split Screen */}
        <div className="flex-1 bg-[#050505] relative flex flex-col lg:flex-row overflow-hidden min-h-0">
          
          {/* Left: Theory & Quiz */}
          <div className={`w-full lg:flex-1 h-full overflow-y-auto min-h-0 ${hasEditor ? 'lg:max-w-[50%] border-b lg:border-b-0 lg:border-r border-white/5' : 'max-w-4xl mx-auto border-none'}`}>
            {activeLesson ? (
              <LessonContent 
                content={activeLesson.content_markdown || 'No content provided for this lesson yet.'}
                quiz={activeLesson.quiz_data}
                onQuizSuccess={handleMarkComplete}
              />
            ) : null}
          </div>

          {/* Right: Code Editor & Terminal */}
          {hasEditor && activeLesson && (
            <div className="hidden lg:flex w-full lg:flex-1 flex-col h-[45vh] lg:h-full min-h-[280px] bg-[#020202] shrink-0 lg:shrink">
              <div className={`p-2 sm:p-4 transition-all duration-300 flex-1 min-h-0 ${isTerminalOpen ? 'h-[65%]' : 'h-full'}`}>
                <CodeEditor 
                  initialValue={activeLesson.starter_code || ''}
                  language="javascript"
                  onChange={setCodeValue}
                  onRun={runMockExecution}
                />
              </div>

              {/* Terminal Panel */}
              {isTerminalOpen && (
                <div className="h-[35%] bg-[#0a0a0a] border-t border-white/10 flex flex-col shadow-2xl">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#050505]">
                    <span className="text-xs font-geist text-white/50 uppercase tracking-widest">Execution Terminal</span>
                    <button 
                      onClick={() => setIsTerminalOpen(false)} 
                      className="text-white/40 hover:text-white transition-colors text-lg"
                    >
                      &times;
                    </button>
                  </div>
                  <ScrollArea.Root className="flex-1 p-4 font-mono text-[13px] leading-relaxed overflow-hidden">
                    <ScrollArea.Viewport className="w-full h-full">
                      {terminalLogs.map(log => (
                        <div key={log.id} className={`mb-1.5 flex gap-2 ${
                          log.type === 'error' ? 'text-red-400' :
                          log.type === 'success' ? 'text-green-400' :
                          log.type === 'system' ? 'text-white/40' :
                          'text-white/80'
                        }`}>
                          <span className="select-none flex-shrink-0">
                            {log.type === 'error' && '✖'}
                            {log.type === 'success' && '✔'}
                            {log.type === 'system' ? '' : log.type === 'info' ? 'ℹ' : '>'}
                          </span>
                          <span className="break-all">{log.message}</span>
                        </div>
                      ))}
                      {isExecuting && (
                        <div className="text-white/60 animate-pulse mt-2 ml-4">_</div>
                      )}
                    </ScrollArea.Viewport>
                    <ScrollArea.Scrollbar orientation="vertical" className="w-1.5 bg-black">
                      <ScrollArea.Thumb className="bg-white/20 hover:bg-white/40 rounded-full" />
                    </ScrollArea.Scrollbar>
                  </ScrollArea.Root>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Bottom Bar */}
        <div className="bg-[#0a0a0a] border-t border-white/10 p-4 sm:p-6 pr-20 sm:pr-6 flex items-center justify-between gap-2 sm:gap-4 h-20 sm:h-24">
          <div className="flex-1 min-w-0 hidden sm:block">
            <h1 className="text-xl font-eb-garamond mb-1 truncate">{activeLesson?.title}</h1>
            <p className="text-sm font-light text-white/60 truncate">{activeModule?.title}</p>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-shrink-0 w-full sm:w-auto">
            {/* Mark complete */}
            {activeLesson && !isCompleted(activeLesson.id) && (
              <button
                onClick={handleMarkComplete}
                disabled={completing}
                className="px-3 sm:px-5 py-2 border border-green-500/30 bg-green-500/10 text-[10px] sm:text-xs font-geist uppercase tracking-wider text-green-400 hover:bg-green-500/20 hover:border-green-500/50 transition-colors disabled:opacity-40 whitespace-nowrap"
              >
                {completing ? 'Saving...' : <>✓ <span className="hidden sm:inline">Mark Complete</span></>}
              </button>
            )}
            {activeLesson && isCompleted(activeLesson.id) && (
              <span className="text-[10px] sm:text-xs font-geist uppercase tracking-wider text-green-400/50 whitespace-nowrap">
                ✓ <span className="hidden sm:inline">Completed</span>
              </span>
            )}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={goToPrevLesson}
                disabled={activeIndex <= 0}
                className="px-3 sm:px-6 py-2 border border-white/20 text-[10px] sm:text-sm font-geist uppercase tracking-wider hover:bg-white/5 transition-colors disabled:opacity-30 whitespace-nowrap"
              >
                Prev<span className="hidden sm:inline">ious</span>
              </button>
              <button
                onClick={goToNextLesson}
                disabled={activeIndex >= allLessons.length - 1}
                className="px-4 sm:px-6 py-2 bg-white text-black text-[10px] sm:text-sm font-geist uppercase tracking-wider hover:bg-neutral-200 transition-colors disabled:opacity-30 whitespace-nowrap"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sidebar Syllabus ── */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}
      <div
        className={`
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
          fixed right-0 top-0 bottom-0 md:relative md:translate-x-0
          w-[80vw] max-w-sm md:w-80 h-full bg-[#0a0a0a] border-l border-white/10 flex flex-col transition-transform duration-500 z-30
        `}
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center h-16">
          <h2 className="font-eb-garamond text-xl">Syllabus</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-white/50 hover:text-white"
          >
            &times;
          </button>
        </div>

        <ScrollArea.Root className="flex-1 overflow-hidden">
          <ScrollArea.Viewport className="w-full h-full p-4">
            {curriculum.map((module) => (
              <div key={module.id} className="mb-8">
                <h3 className="text-xs font-geist text-white/50 uppercase tracking-widest mb-4 px-2">
                  {module.title}
                </h3>
                <div className="space-y-1">
                  {module.lessons.map((lesson) => {
                    const done = isCompleted(lesson.id);
                    const active = activeLesson?.id === lesson.id;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setActiveLesson(lesson)}
                        className={`
                          w-full p-3 flex gap-3 cursor-pointer transition-colors group text-left
                          ${active ? 'bg-white/10' : 'hover:bg-white/5'}
                        `}
                        style={{ background: active ? 'rgba(255,255,255,0.08)' : undefined, border: 'none' }}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {done ? (
                            <div className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-white rounded-full" />
                            </div>
                          ) : active ? (
                            <div className="w-4 h-4 rounded-full border border-white/70 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-white rounded-full" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-white/20 group-hover:border-white/50 transition-colors" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-light truncate ${active ? 'text-white' : done ? 'text-white/50 line-through' : 'text-white/70 group-hover:text-white'} transition-colors`}>
                            {lesson.title}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar orientation="vertical" className="w-1.5 bg-black">
            <ScrollArea.Thumb className="bg-white/20 hover:bg-white/40 rounded-full" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      </div>

    </div>
  );
}
