import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import * as Progress from '@radix-ui/react-progress';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import {
  getEnrollments,
  getLessonProgress,
  getPlatformSettings,
  type Course,
  type LessonProgress,
} from '../lib/supabase';
import { CertificateTemplate } from '../components/CertificateTemplate';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download } from 'lucide-react';

type EnrolledCourseData = {
  course: Course;
  progress: LessonProgress[];
  totalLessons: number;
};

export default function Dashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourseData[]>([]);
  const [globalResources, setGlobalResources] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isGeneratingCert, setIsGeneratingCert] = useState<string | null>(null);
  const certRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Creator';

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

        // 3. Load global settings
        const settings = await getPlatformSettings('global_resources');
        if (settings) setGlobalResources(settings);
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
      bgImg.src = '/images/completion-certificate.png';
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

        {/* Continue Learning */}
        <section className="dashboard-item mb-12">
          <h2 className="text-xl font-eb-garamond mb-6 border-b border-white/10 pb-4">
            Continue Learning
          </h2>

          {enrolledCourses.length > 0 ? (
            <div className="space-y-6">
              {enrolledCourses.map((data, index) => {
                const completedCount = data.progress.filter(p => p.completed).length;
                const progressPct = data.totalLessons > 0 ? Math.round((completedCount / data.totalLessons) * 100) : 0;
                
                const registrationNumber = `QA-${data.course.id.substring(0, 4).toUpperCase()}-${user?.id?.substring(0, 4).toUpperCase() || '0000'}-${new Date().getFullYear()}`;

                return (
                  <div key={index} className="relative group overflow-hidden p-6 border border-white/10 bg-white/[0.02] flex flex-col md:flex-row gap-8 items-center hover:bg-white/[0.04] transition-colors duration-500">
                    
                    {/* Render Hidden Certificate Template for this Course */}
                    <CertificateTemplate 
                      ref={el => { certRefs.current[data.course.id] = el; }}
                      studentName={displayName}
                      courseName={data.course.title}
                      date={new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      registrationNumber={registrationNumber}
                    />

                    {/* Custom HTML/CSS YouTube-Style Thumbnail */}
                    <div className="w-full md:w-72 aspect-video bg-[#0a0a0a] border border-white/10 relative overflow-hidden flex-shrink-0 group-hover:border-white/30 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all duration-500 rounded-sm">
                      
                      {/* Background Gradient & Patterns */}
                      <div 
                        className="absolute inset-0 opacity-80 group-hover:scale-105 transition-transform duration-700"
                        style={{
                          background: data.course.slug.includes('python') 
                            ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                            : 'linear-gradient(135deg, #14532d 0%, #052e16 100%)'
                        }}
                      />
                      
                      {/* Geometric Accents */}
                      <div 
                        className="absolute right-0 top-0 w-32 h-64 opacity-20 rotate-45 translate-x-16 -translate-y-16"
                        style={{
                          background: data.course.slug.includes('python') ? '#FFD43B' : '#4ade80',
                          filter: 'blur(40px)'
                        }}
                      />
                      
                      {/* Instructor Image Placeholder (Requires zaka-thumb.png in public folder) */}
                      <div className="absolute right-[-10px] bottom-0 h-[110%] w-[55%] flex items-end justify-end opacity-90 group-hover:scale-105 transition-transform duration-500 z-0 drop-shadow-2xl">
                         <img 
                           src="/zaka-thumb.png" 
                           alt="Instructor" 
                           className="object-contain h-full"
                           onError={(e) => { e.currentTarget.style.display = 'none'; }}
                         />
                      </div>

                      {/* Catchline Text */}
                      <div className="absolute inset-0 p-4 flex flex-col justify-center z-10 w-2/3">
                        <div className="transform -rotate-2">
                          <h4 className="text-[10px] font-mono text-white/70 uppercase tracking-widest mb-1">
                            {data.course.slug.includes('python') ? 'QA Automation' : 'Master The Craft'}
                          </h4>
                          <h3 
                            className="text-2xl leading-none font-black italic uppercase tracking-tighter"
                            style={{
                              color: data.course.slug.includes('python') ? '#FFD43B' : '#ffffff',
                              textShadow: '2px 2px 0px rgba(0,0,0,0.5)'
                            }}
                          >
                            {data.course.slug.includes('python') ? (
                              <>LEARN<br/>PYTHON</>
                            ) : (
                              <>SELENIUM<br/><span className="text-[#4ade80]">AUTOMATION</span></>
                            )}
                          </h3>
                        </div>
                      </div>

                      {/* Play Button Overlay (Fades in on hover) */}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/40 shadow-lg scale-90 group-hover:scale-100 transition-all duration-300">
                          <div className="w-0 h-0 border-t-6 border-t-transparent border-l-8 border-l-white border-b-6 border-b-transparent ml-1" />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 w-full">
                      <div className="text-xs font-geist text-white/50 uppercase tracking-wider mb-2">
                        {completedCount} of {data.totalLessons} lessons complete
                      </div>
                      <h3 className="text-2xl font-eb-garamond mb-4">{data.course.title}</h3>
                      {data.course.description && (
                        <p className="text-white/50 font-inter font-light text-sm mb-4">{data.course.description}</p>
                      )}

                      <div className="mb-4">
                        <div className="flex justify-between text-xs font-inter font-light text-white/50 mb-2">
                          <span>Overall Progress</span>
                          <span>{progressPct}% Complete</span>
                        </div>
                        <Progress.Root
                          className="relative overflow-hidden bg-white/10 rounded-none h-1 w-full"
                          value={progressPct}
                        >
                          <Progress.Indicator
                            className="bg-white h-full transition-all duration-1000 ease-out"
                            style={{ width: `${progressPct}%` }}
                          />
                        </Progress.Root>
                      </div>

                      <div className="flex gap-4">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/course/${data.course.id}`)}>
                          {completedCount === 0 ? 'Start Course' : progressPct === 100 ? 'Replay Course' : 'Resume Lesson'}
                        </Button>
                        
                        {progressPct === 100 && (
                          <Button 
                            variant="primary" 
                            size="sm" 
                            className="bg-gradient-to-r from-yellow-500 to-yellow-600 border-none text-black hover:opacity-90 transition-opacity"
                            onClick={() => handleDownloadCertificate(data.course.id, data.course.title)}
                            disabled={isGeneratingCert === data.course.id}
                          >
                            {isGeneratingCert === data.course.id ? (
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                Generating...
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 font-semibold">
                                <Download size={16} />
                                Download Certificate
                              </div>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 border border-white/10 text-center text-white/40 font-inter font-light text-sm">
              No courses enrolled yet.{' '}
              <button onClick={() => navigate('/pricing')} className="text-white underline underline-offset-4">
                Browse courses
              </button>
            </div>
          )}
        </section>

        {/* Resources + Community */}
        <section className="dashboard-item grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-eb-garamond mb-6 border-b border-white/10 pb-4">Resources</h2>
            <ul className="space-y-4">
              {globalResources?.docs?.map((doc: any, i: number) => (
                <li
                  key={i}
                  className="flex justify-between items-center p-4 border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors cursor-pointer"
                  onClick={() => window.open(doc.url, '_blank', 'noopener,noreferrer')}
                >
                  <span className="font-inter font-light text-sm">{doc.title}</span>
                  <span className="font-geist text-xs text-white/50 uppercase">View</span>
                </li>
              ))}
              {globalResources?.github_url && (
                <li
                  className="flex justify-between items-center p-4 border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors cursor-pointer"
                  onClick={() => window.open(globalResources.github_url, '_blank', 'noopener,noreferrer')}
                >
                  <span className="font-inter font-light text-sm">Zong Automation Framework</span>
                  <span className="font-geist text-xs text-white/50 uppercase">GitHub</span>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-eb-garamond mb-6 border-b border-white/10 pb-4">Community</h2>
            <div className="p-8 border border-white/10 bg-white/[0.02] text-center">
              <p className="font-inter font-light text-white/70 mb-6 text-sm leading-relaxed">
                Join the private Discord server to connect with other alumni, share your work, and get direct feedback.
              </p>
              <Button 
                variant="outline" 
                fullWidth
                onClick={() => globalResources?.discord_url && window.open(globalResources.discord_url, '_blank', 'noopener,noreferrer')}
              >
                Join Discord
              </Button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
