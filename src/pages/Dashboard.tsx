import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import * as Progress from '@radix-ui/react-progress';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import {
  getEnrollments,
  getLessonProgress,
  type Course,
  type LessonProgress,
} from '../lib/supabase';
import { CertificateTemplate } from '../components/CertificateTemplate';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download, BookOpen, CheckCircle, ChevronRight, MonitorPlay } from 'lucide-react';

type EnrolledCourseData = {
  course: Course;
  progress: LessonProgress[];
  totalLessons: number;
};

export default function Dashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingCert, setIsGeneratingCert] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'not_started' | 'in_progress' | 'completed'>('all');
  const certRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const [notes, setNotes] = useState(() => localStorage.getItem('zaka_personal_notes') || '');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | ''>('');

  const displayName =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Creator';

  // Handle auto-saving notes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (notes !== localStorage.getItem('zaka_personal_notes')) {
        setSaveStatus('saving');
        localStorage.setItem('zaka_personal_notes', notes);
        setTimeout(() => setSaveStatus('saved'), 500);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [notes]);

  useEffect(() => {
    if (!user) return;

    const init = async () => {
      try {
        // 1. Check enrollments
        const enrollments = await getEnrollments(user.id);

        if (enrollments.length > 0) {
          const coursesData = await Promise.all(
            enrollments.map(async (e: any) => {
              const activeCourse = e.courses as Course;
              const prog = await getLessonProgress(user.id, activeCourse.id);
              
              const { data: lessons } = await import('../lib/supabase').then(m =>
                m.supabase
                  .from('lessons')
                  .select('id, modules!inner(course_id)')
                  .eq('modules.course_id', activeCourse.id)
              );
              
              return {
                course: activeCourse,
                progress: prog,
                totalLessons: lessons?.length ?? 0
              };
            })
          );
          setEnrolledCourses(coursesData);
        }
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [user]);

  useEffect(() => {
    if (loading) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.dashboard-item',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power2.out' }
      );
    }, containerRef);
    return () => ctx.revert();
  }, [loading]);

  // (Progress calc moved into map)

  const handleDownloadCertificate = async (courseId: string, courseTitle: string) => {
    const certElement = certRefs.current[courseId];
    if (!certElement) return;

    setIsGeneratingCert(courseId);
    try {
      // 1. Create the PDF instance
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1123, 794]
      });

      // 2. Load and add the background image directly (bulletproof rendering)
      const bgImg = new Image();
      bgImg.src = '/images/completion-certificate.webp';
      await new Promise((resolve, reject) => {
        bgImg.onload = resolve;
        bgImg.onerror = reject;
      });
      pdf.addImage(bgImg, 'PNG', 0, 0, 1123, 794);

      // 3. Render the text overlay using html2canvas (transparent background)
      const canvas = await html2canvas(certElement, {
        scale: 2, // High resolution
        backgroundColor: null, // Ensure transparent background
      });

      // 4. Add the transparent text layer on top of the background
      const textImgData = canvas.toDataURL('image/png');
      pdf.addImage(textImgData, 'PNG', 0, 0, 1123, 794);

      // 5. Save the PDF
      pdf.save(`${courseTitle.replace(/\s+/g, '_')}_Certificate.pdf`);
    } catch (error) {
      console.error('Error generating certificate:', error);
      alert('Failed to generate certificate. Please try again.');
    } finally {
      setIsGeneratingCert(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="loading-text">
          <span>L</span><span>O</span><span>A</span><span>D</span><span>I</span><span>N</span><span>G</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="pt-32 pb-24 min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">

        <header className="dashboard-item mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-eb-garamond mb-2">Your Dashboard</h1>
            <p className="text-white/60 font-inter font-light">
              Welcome back, <span className="text-white">{displayName}</span>.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {enrolledCourses.length > 0 && (
              <div className="text-sm font-geist text-white/50 uppercase tracking-widest">
                Lifetime Member
              </div>
            )}
            <button
              onClick={async () => { await signOut(); navigate('/login'); }}
              className="text-xs font-inter font-light text-white/30 hover:text-red-400 transition-colors duration-300 uppercase tracking-widest"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Modern Dashboard Layout */}
        
        {/* Continue Learning (Horizontal Scroll) */}
        {(() => {
          const inProgressCourses = enrolledCourses.filter(data => {
            const completedCount = data.progress.filter(p => p.completed).length;
            const progressPct = data.totalLessons > 0 ? Math.round((completedCount / data.totalLessons) * 100) : 0;
            return progressPct > 0 && progressPct < 100;
          });

          if (inProgressCourses.length === 0) return null;

          return (
            <section className="dashboard-item mb-16">
              <h2 className="text-2xl font-eb-garamond mb-6">Continue Learning</h2>
              <div className="flex overflow-x-auto pb-8 gap-6 snap-x hide-scrollbar">
                {inProgressCourses.map((data, index) => {
                  const completedCount = data.progress.filter(p => p.completed).length;
                  const progressPct = data.totalLessons > 0 ? Math.round((completedCount / data.totalLessons) * 100) : 0;
                  
                  return (
                    <div key={index} className="min-w-[90vw] md:min-w-[600px] flex-shrink-0 snap-start bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] transition-colors p-6 rounded-none">
                      <div className="flex flex-col md:flex-row gap-6">
                        
                        {/* Thumbnail */}
                        <div className="w-full md:w-56 aspect-video bg-[#0a0a0a] border border-white/10 relative overflow-hidden flex-shrink-0">
                          <div 
                            className="absolute inset-0 opacity-80"
                            style={{
                              background: data.course.slug.includes('python') 
                                ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                                : 'linear-gradient(135deg, #14532d 0%, #052e16 100%)'
                            }}
                          />
                          <div className="absolute inset-0 p-4 flex flex-col justify-center z-10 w-2/3 transform -rotate-2">
                            <h4 className="text-[8px] font-mono text-white/70 uppercase tracking-widest mb-1">
                              {data.course.slug.includes('python') ? 'QA Automation' : 'Master The Craft'}
                            </h4>
                            <h3 className="text-xl leading-none font-black italic uppercase tracking-tighter" style={{ color: data.course.slug.includes('python') ? '#FFD43B' : '#ffffff', textShadow: '2px 2px 0px rgba(0,0,0,0.5)' }}>
                              {data.course.slug.includes('python') ? <>LEARN<br/>PYTHON</> : <>SELENIUM<br/><span className="text-[#4ade80]">AUTOMATION</span></>}
                            </h3>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="text-[10px] font-geist text-[#4ade80] mb-2 flex items-center gap-2 tracking-widest uppercase">
                              <MonitorPlay size={12} /> Course
                            </div>
                            <h3 className="text-xl font-eb-garamond mb-4 leading-tight">{data.course.title}</h3>
                            
                            <div className="flex items-center gap-4 mb-4">
                              <span className="text-xs font-geist text-white/50 w-24">Progress: {progressPct}%</span>
                              <Progress.Root className="h-1 bg-white/10 w-full rounded-none" value={progressPct}>
                                <Progress.Indicator className="bg-[#4ade80] h-full transition-all duration-1000 ease-out" style={{ width: `${progressPct}%` }} />
                              </Progress.Root>
                            </div>
                          </div>

                          <div className="flex justify-between items-center border-t border-white/5 pt-4 mt-2">
                            <span className="text-xs font-inter font-light text-white/40 flex items-center gap-2">
                              Keep up the momentum <ChevronRight size={12}/>
                            </span>
                            <Button variant="outline" size="sm" onClick={() => navigate(`/course/${data.course.id}`)}>
                              Continue
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* All Materials (Filterable Grid) */}
        <section className="dashboard-item mb-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-white/10 pb-6">
            <h2 className="text-2xl font-eb-garamond flex items-center gap-3">
              All Materials 
              <span className="text-xs font-geist bg-white/10 px-2 py-1 rounded-sm text-white/60">
                {enrolledCourses.length}
              </span>
            </h2>
            
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'All Status' },
                { id: 'not_started', label: 'Not Started' },
                { id: 'in_progress', label: 'In Progress' },
                { id: 'completed', label: 'Completed' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={`text-xs font-geist px-4 py-2 uppercase tracking-wider transition-colors border ${
                    filter === f.id 
                      ? 'bg-white text-black border-white' 
                      : 'bg-transparent text-white/50 border-white/10 hover:border-white/30'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {enrolledCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.filter(data => {
                if (filter === 'all') return true;
                const completedCount = data.progress.filter(p => p.completed).length;
                const progressPct = data.totalLessons > 0 ? Math.round((completedCount / data.totalLessons) * 100) : 0;
                if (filter === 'not_started') return progressPct === 0;
                if (filter === 'in_progress') return progressPct > 0 && progressPct < 100;
                if (filter === 'completed') return progressPct === 100;
                return true;
              }).map((data, index) => {
                const completedCount = data.progress.filter(p => p.completed).length;
                const progressPct = data.totalLessons > 0 ? Math.round((completedCount / data.totalLessons) * 100) : 0;
                const registrationNumber = `QA-${data.course.id.substring(0, 4).toUpperCase()}-${user?.id?.substring(0, 4).toUpperCase() || '0000'}-${new Date().getFullYear()}`;

                return (
                  <div key={index} className="flex flex-col p-6 bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] transition-colors">
                    {/* Hidden Certificate logic */}
                    <CertificateTemplate 
                      ref={el => { certRefs.current[data.course.id] = el; }}
                      studentName={displayName}
                      courseName={data.course.title}
                      date={new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      registrationNumber={registrationNumber}
                    />

                    {/* Top Meta */}
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-geist bg-white/5 px-2 py-1 flex items-center gap-2 uppercase tracking-widest text-white/70 border border-white/5">
                        <BookOpen size={10}/> {data.totalLessons} Chapters
                      </span>
                      {progressPct === 100 && (
                        <span className="text-[10px] font-geist text-[#4ade80] flex items-center gap-1 uppercase tracking-widest">
                          <CheckCircle size={10}/> Certified
                        </span>
                      )}
                    </div>
                    
                    {/* Thumbnail representation for vertical card */}
                    <div className="w-full aspect-video bg-[#0a0a0a] border border-white/5 relative overflow-hidden mb-6 opacity-80">
                      <div 
                        className="absolute inset-0"
                        style={{
                          background: data.course.slug.includes('python') 
                            ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                            : 'linear-gradient(135deg, #14532d 0%, #052e16 100%)'
                        }}
                      />
                      <div className="absolute right-[-10px] bottom-0 h-full w-[60%] flex items-end justify-end z-0">
                         <img src="/zaka-thumb.webp" alt="Instructor" className="object-contain h-full" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      </div>
                    </div>

                    <h3 className="text-xl font-eb-garamond mb-4 flex-grow">{data.course.title}</h3>
                    
                    {/* Tags */}
                    <div className="flex gap-2 mb-6">
                      <span className="text-[10px] font-inter text-white/40 bg-white/5 px-2 py-1 border border-white/5">QA Automation</span>
                      <span className="text-[10px] font-inter text-white/40 bg-white/5 px-2 py-1 border border-white/5">
                        {progressPct === 0 ? 'Not Started' : progressPct === 100 ? 'Completed' : 'In Progress'}
                      </span>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-center border-t border-white/10 pt-4 mt-auto">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border border-white/20 relative flex items-center justify-center">
                          <div 
                            className="absolute inset-0 rounded-full"
                            style={{
                              background: `conic-gradient(#4ade80 ${progressPct}%, transparent 0)`
                            }}
                          />
                          <div className="w-3 h-3 bg-[#0a0a0a] rounded-full z-10" />
                        </div>
                        <span className="text-xs font-geist text-white/60">Progress: {progressPct}%</span>
                      </div>
                      
                      {progressPct === 100 ? (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/course/${data.course.id}`)}>Replay</Button>
                          <Button 
                            variant="primary" 
                            size="sm" 
                            className="bg-[#4ade80] text-black border-none px-3"
                            onClick={() => handleDownloadCertificate(data.course.id, data.course.title)}
                            disabled={isGeneratingCert === data.course.id}
                          >
                            {isGeneratingCert === data.course.id ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <Download size={14} />}
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => navigate(`/course/${data.course.id}`)}>
                          {progressPct === 0 ? 'Start' : 'Continue'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 border border-white/10 text-center text-white/40 font-inter font-light text-sm bg-white/[0.01]">
              No courses enrolled yet.{' '}
              <button onClick={() => navigate('/pricing')} className="text-white hover:text-[#4ade80] transition-colors underline underline-offset-4">
                Browse our catalog
              </button>
            </div>
          )}
        </section>

        {/* Personal Notes */}
        <section className="dashboard-item">
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
            <h2 className="text-xl font-eb-garamond">Personal Notes</h2>
            <div className="text-xs font-geist text-white/40 h-4">
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'saved' && 'All changes saved.'}
            </div>
          </div>
          
          <div className="relative group">
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setSaveStatus('');
              }}
              placeholder="Jot down important concepts, code snippets, or ideas here. Your notes are automatically saved to your browser..."
              className="w-full h-64 bg-white/[0.02] border border-white/10 focus:border-white/30 rounded-none p-6 text-white/80 font-inter font-light text-sm outline-none resize-y transition-colors placeholder:text-white/20"
              spellCheck={false}
            />
            <div className="absolute inset-0 pointer-events-none border border-white/0 group-hover:border-white/5 transition-colors" />
          </div>
        </section>

      </div>
    </div>
  );
}
