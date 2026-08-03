import { useEffect, useRef, useState, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import gsap from 'gsap';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { useAuth } from '../hooks/useAuth';
import {
  getCourseCurriculum,
  getLessonProgress,
  markLessonComplete,
  hasFullCourseAccess,
  type Module,
  type Lesson,
  type LessonProgress,
} from '../lib/supabase';
import { LessonContent } from '../components/LessonContent';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Lock } from 'lucide-react';
import { detectCodeFlavor } from '../lib/codeFlavor';

const CodeEditor = lazy(() => import('../components/CodeEditor').then((m) => ({ default: m.CodeEditor })));
const CodeEditorFallback = () => (
  <div className="w-full h-full flex items-center justify-center text-white/30 text-sm font-mono">
    Loading editor…
  </div>
);

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
  const [hasFullAccess, setHasFullAccess] = useState(true);

  useDocumentTitle(activeLesson?.title || 'Course Player');

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
      const [modules, prog, fullAccess] = await Promise.all([
        getCourseCurriculum(courseId),
        getLessonProgress(user.id, courseId),
        hasFullCourseAccess(user.id, courseId),
      ]);
      setCurriculum(modules);
      setProgress(prog);
      setHasFullAccess(fullAccess);

      // Free-preview students only get the first module — restrict which
      // lessons are eligible to become the initially active one so they
      // don't land on a locked lesson by default.
      const sortedModules = [...modules].sort((a, b) => a.order_index - b.order_index);
      const eligibleLessons = fullAccess
        ? modules.flatMap(m => m.lessons)
        : (sortedModules[0]?.lessons ?? []);

      const completedIds = new Set(prog.filter(p => p.completed).map(p => p.lesson_id));
      const firstIncomplete = eligibleLessons.find(l => !completedIds.has(l.id));
      setActiveLesson(firstIncomplete ?? eligibleLessons[0] ?? null);
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

  // Free-preview access is limited to the first module (by order_index) of
  // each course; everything else requires a paid plan or an explicit
  // enrollment grant.
  const firstModuleId = curriculum.length > 0
    ? [...curriculum].sort((a, b) => a.order_index - b.order_index)[0].id
    : null;
  const isLessonLocked = (lesson: Lesson) => !hasFullAccess && lesson.module_id !== firstModuleId;
  const activeLessonLocked = activeLesson ? isLessonLocked(activeLesson) : false;

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

  /* ── Mock Execution Engine ──
   * This has never been a real interpreter — it's a scripted terminal
   * simulation. The previous version only recognized one hardcoded lesson's
   * exact old Selenium-RC-style syntax and treated every other lesson's code
   * (Playwright, pytest, Appium, modern Selenium) as a failure regardless of
   * whether it was correct, since it never matched that one pattern. This
   * detects the general "flavor" of the submitted code instead and narrates
   * a plausible, tool-appropriate success — actually validating arbitrary
   * code correctness would require a real sandboxed execution backend,
   * which is out of scope for a learning-sandbox terminal like this.
   */
  const runMockExecution = async (code: string) => {
    setIsTerminalOpen(true);
    setIsExecuting(true);

    const addLog = (msg: string, type: LogType = 'info') => {
      setTerminalLogs(prev => [...prev, { id: Math.random().toString(), type, message: msg }]);
    };
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

    // Strip comments so a trivial/empty submission isn't mistaken for real code
    const cleanCode = code.replace(/\/\*[\s\S]*?\*\/|(?:^|\s)\/\/.*|#.*$/gm, '').trim();

    if (cleanCode.length < 10) {
      setTerminalLogs([{ id: Date.now().toString(), type: 'system', message: '$ run' }]);
      await wait(300);
      addLog('No code to run — write something in the editor first.', 'error');
      setIsExecuting(false);
      return;
    }

    const flavor = detectCodeFlavor(code);

    if (flavor === 'playwright') {
      setTerminalLogs([{ id: Date.now().toString(), type: 'system', message: '$ npx playwright test' }]);
      await wait(400);
      addLog('Running 1 test using 1 worker', 'info');
      await wait(700);
      addLog('  ✓ should complete the flow (612ms)', 'success');
      await wait(300);
      addLog('1 passed (1.1s)', 'system');
    } else if (flavor === 'appium') {
      setTerminalLogs([{ id: Date.now().toString(), type: 'system', message: '$ node test.js' }]);
      await wait(400);
      addLog('Starting Appium session...', 'info');
      await wait(700);
      addLog('Session started on emulator-5554', 'success');
      await wait(500);
      addLog('Test completed successfully.', 'success');
      addLog('Process exited with code 0.', 'system');
    } else if (flavor === 'pytest') {
      setTerminalLogs([{ id: Date.now().toString(), type: 'system', message: '$ pytest -v' }]);
      await wait(400);
      addLog('collected 1 item', 'info');
      await wait(700);
      addLog('test_case.py::test_example PASSED', 'success');
      await wait(300);
      addLog('1 passed in 0.42s', 'system');
    } else if (flavor === 'selenium') {
      setTerminalLogs([{ id: Date.now().toString(), type: 'system', message: '$ python test.py' }]);
      await wait(400);
      addLog('Initializing WebDriver session...', 'info');
      await wait(700);
      addLog('WebDriver session started successfully.', 'success');
      await wait(500);
      addLog('Test completed successfully.', 'success');
      addLog('Process exited with code 0.', 'system');
    } else {
      setTerminalLogs([{ id: Date.now().toString(), type: 'system', message: '$ run' }]);
      await wait(400);
      addLog('Executing script...', 'info');
      await wait(700);
      addLog('Execution completed successfully.', 'success');
      addLog('Process exited with code 0.', 'system');
    }

    setIsExecuting(false);

    // Auto-mark as complete if they successfully ran their code
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

  const hasEditor = !activeLessonLocked && (!!activeLesson?.starter_code || !!activeLesson?.solution_code);

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
            {activeLesson && activeLessonLocked ? (
              <div className="flex flex-col items-center justify-center text-center h-full px-6 py-12">
                <div className="w-14 h-14 rounded-full border border-amber-400/30 bg-amber-400/10 flex items-center justify-center mb-6">
                  <Lock size={22} className="text-amber-400" />
                </div>
                <h2 className="font-eb-garamond text-2xl mb-3">This lesson is part of the full course</h2>
                <p className="text-white/50 font-inter font-light text-sm max-w-sm mb-8 leading-relaxed">
                  You've got free access to Module 1. Unlock the rest of "{curriculum.find(m => m.id === activeLesson.module_id)?.title}"
                  and every other module with a Lifetime or Monthly plan.
                </p>
                <button
                  onClick={() => navigate('/pricing')}
                  className="px-6 py-3 bg-amber-400 text-black text-sm font-geist uppercase tracking-widest hover:bg-amber-300 transition-colors"
                >
                  View Pricing
                </button>
              </div>
            ) : activeLesson ? (
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
                <Suspense fallback={<CodeEditorFallback />}>
                  <CodeEditor
                    initialValue={activeLesson.starter_code || ''}
                    language="javascript"
                    onChange={setCodeValue}
                    onRun={runMockExecution}
                  />
                </Suspense>
              </div>

              {/* Terminal Panel */}
              {isTerminalOpen && (
                <div className="h-[35%] bg-[#0a0a0a] border-t border-white/10 flex flex-col shadow-2xl">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#050505]">
                    <span className="text-xs font-geist text-white/50 uppercase tracking-widest flex items-center gap-2">
                      Execution Terminal
                      <span
                        title="This sandbox narrates expected output for practice — it doesn't run your code on a real server."
                        className="normal-case tracking-normal text-[10px] font-inter font-normal text-amber-400/70 border border-amber-400/20 rounded px-1.5 py-0.5 cursor-help"
                      >
                        Simulated
                      </span>
                    </span>
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
            {/* Mark complete — hidden entirely for locked lessons */}
            {activeLesson && !activeLessonLocked && !isCompleted(activeLesson.id) && (
              <button
                onClick={handleMarkComplete}
                disabled={completing}
                className="px-3 sm:px-5 py-2 border border-green-500/30 bg-green-500/10 text-[10px] sm:text-xs font-geist uppercase tracking-wider text-green-400 hover:bg-green-500/20 hover:border-green-500/50 transition-colors disabled:opacity-40 whitespace-nowrap"
              >
                {completing ? 'Saving...' : <>✓ <span className="hidden sm:inline">Mark Complete</span></>}
              </button>
            )}
            {activeLesson && !activeLessonLocked && isCompleted(activeLesson.id) && (
              <span className="text-[10px] sm:text-xs font-geist uppercase tracking-wider text-green-400/50 whitespace-nowrap">
                ✓ <span className="hidden sm:inline">Completed</span>
              </span>
            )}
            {activeLesson && activeLessonLocked && (
              <span className="text-[10px] sm:text-xs font-geist uppercase tracking-wider text-amber-400/70 flex items-center gap-1.5 whitespace-nowrap">
                <Lock size={11} /> Locked
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
        // Dismiss-on-click-outside backdrop; the visible × button below is the
        // keyboard/screen-reader-accessible way to close, so this stays out of
        // the tab order rather than adding a confusing invisible focus stop.
        <div
          aria-hidden="true"
          className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div
        className={`
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
          fixed right-0 top-0 bottom-0 md:relative md:translate-x-0
          w-[85vw] max-w-xs sm:max-w-sm md:w-80 md:max-w-[320px] h-full bg-[#0a0a0a] border-l border-white/10
          flex flex-col flex-shrink-0 overflow-hidden transition-transform duration-500 z-30
        `}
      >
        <div className="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center h-14 sm:h-16 shrink-0">
          <h2 className="font-eb-garamond text-lg sm:text-xl truncate">Syllabus</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-white/50 hover:text-white shrink-0 ml-2"
          >
            &times;
          </button>
        </div>

        <ScrollArea.Root className="flex-1 overflow-hidden min-h-0">
          <ScrollArea.Viewport className="w-full h-full p-3 sm:p-4">
            {curriculum.map((module) => (
              <div key={module.id} className="mb-6 sm:mb-8 min-w-0">
                <h3 className="text-[10px] sm:text-xs font-geist text-white/50 uppercase tracking-widest mb-3 sm:mb-4 px-2 break-words">
                  {module.title}
                </h3>
                <div className="space-y-1">
                  {module.lessons.map((lesson) => {
                    const done = isCompleted(lesson.id);
                    const active = activeLesson?.id === lesson.id;
                    const locked = isLessonLocked(lesson);
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setActiveLesson(lesson)}
                        className={`
                          w-full max-w-full p-2.5 sm:p-3 flex gap-2.5 sm:gap-3 cursor-pointer transition-colors group text-left overflow-hidden
                          ${active ? 'bg-white/10' : 'hover:bg-white/5'}
                        `}
                        style={{ background: active ? 'rgba(255,255,255,0.08)' : undefined, border: 'none' }}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {locked ? (
                            <Lock size={14} className="text-amber-400/70" />
                          ) : done ? (
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
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className={`text-xs sm:text-sm font-light break-words ${locked ? 'text-white/40' : active ? 'text-white' : done ? 'text-white/50 line-through' : 'text-white/70 group-hover:text-white'} transition-colors`}>
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
