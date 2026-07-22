import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Users, DollarSign, Activity, BookOpen, Plus, Trash2, Edit2, Save, LayoutDashboard, ListTree, UploadCloud
} from 'lucide-react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { 
  getCourseCurriculum, updateModule, updateLesson, 
  createModule, createLesson, deleteModule, deleteLesson,
  getAllProfiles, updateUserRole, adminEnrollUser,
  type Module, type Profile
} from '../lib/supabase';
import { CodeEditor } from '../components/CodeEditor';



function LiveClockWidget() {
  const [time, setTime] = useState(new Date());
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      setBlink(b => !b);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="border-2 border-dashed border-[#333] p-6 rounded-none flex flex-col justify-between h-full bg-[#050505]">
      <div className="flex justify-between items-start">
        <span className="text-white text-sm font-geist uppercase tracking-[0.2em]">Sys.Clock</span>
        <div className={`w-3 h-3 rounded-full bg-[#ea1f27] transition-opacity duration-300 ${blink ? 'opacity-100' : 'opacity-20'}`} />
      </div>
      <div className="mt-8 font-ndot text-4xl sm:text-5xl md:text-7xl tracking-widest text-white">
        {time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'curriculum' | 'users' | 'content'>('analytics');
  // Data state
  const [stats, setStats] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [courseId, setCourseId] = useState<string>('');
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Editor state
  const [selectedItem, setSelectedItem] = useState<{type: 'module' | 'lesson', id: string} | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // Create Modal State
  const [createModal, setCreateModal] = useState<{ isOpen: boolean, type: 'module' | 'lesson', targetId: string | null }>({ isOpen: false, type: 'module', targetId: null });
  const [createInput, setCreateInput] = useState('');

  // Custom Dialog States
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; message: string; onConfirm: () => void } | null>(null);
  const [alertDialog, setAlertDialog] = useState<{ isOpen: boolean; message: string } | null>(null);

  const showAlert = (message: string) => {
    setAlertDialog({ isOpen: true, message });
  };

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, message, onConfirm });
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingStats(true);
    try {
      // Import the real stats function instead
      const { getRealAdminStats } = await import('../lib/supabase');
      const s = await getRealAdminStats();
      setStats(s);
      
      const { supabase } = await import('../lib/supabase');
      const { data: c } = await supabase.from('courses').select('id').order('created_at', { ascending: false }).limit(1).single();
      if (c) {
        setCourseId(c.id);
        const mods = await getCourseCurriculum(c.id);
        setModules(mods);
      }
      
      const profilesData = await getAllProfiles();
      setAllProfiles(profilesData);
    } catch (error) {
      console.error("Failed to load admin data:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  /* ── Handlers ── */
  const handleSelectItem = (type: 'module' | 'lesson', id: string) => {
    setSelectedItem({ type, id });
    if (type === 'module') {
      const m = modules.find(x => x.id === id);
      if (m) setEditForm({ ...m });
    } else {
      const l = modules.flatMap(m => m.lessons).find(x => x.id === id);
      if (l) setEditForm({ ...l });
    }
  };

  const handleSave = async () => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      if (selectedItem.type === 'module') {
        await updateModule(selectedItem.id, { title: editForm.title, order_index: editForm.order_index });
      } else {
        await updateLesson(selectedItem.id, { 
          title: editForm.title, 
          content_markdown: editForm.content_markdown,
          starter_code: editForm.starter_code,
          order_index: editForm.order_index
        });
      }
      await loadData(); // Reload to reflect changes
      showAlert('Saved successfully!');
    } catch (e) {
      console.error(e);
      showAlert('Error saving.');
    }
    setSaving(false);
  };

  const handleCreateModule = () => {
    if (!courseId) return;
    setCreateInput('');
    setCreateModal({ isOpen: true, type: 'module', targetId: null });
  };

  const handleCreateLesson = (moduleId: string) => {
    setCreateInput('');
    setCreateModal({ isOpen: true, type: 'lesson', targetId: moduleId });
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    showConfirm(`Change role to ${newRole}?`, async () => {
      try {
        await updateUserRole(userId, newRole);
        const profiles = await getAllProfiles();
        setAllProfiles(profiles);
      } catch (e: any) {
        showAlert(`Error: ${e.message}`);
      }
    });
  };

  const handleAdminEnroll = (userId: string) => {
    if (!courseId) return showAlert('No course found to enroll in.');
    showConfirm('Manually grant lifetime enrollment?', async () => {
      try {
        await adminEnrollUser(userId, courseId);
        showAlert('User successfully enrolled!');
        await loadData();
      } catch (e: any) {
        showAlert(`Error: ${e.message}`);
      }
    });
  };

  const submitCreate = async () => {
    if (!createInput.trim()) return;
    setSaving(true);
    try {
      if (createModal.type === 'module') {
        await createModule(courseId, createInput, modules.length + 1);
      } else if (createModal.type === 'lesson' && createModal.targetId) {
        const m = modules.find(x => x.id === createModal.targetId);
        const order = m ? m.lessons.length + 1 : 1;
        await createLesson(createModal.targetId, createInput, order);
      }
      await loadData();
      setCreateModal({ ...createModal, isOpen: false });
    } catch (e: any) {
      console.error(e);
      showAlert(`Error creating item: ${e.message || 'Unknown error'}. Note: Supabase RLS policies might be blocking INSERTS.`);
    }
    setSaving(false);
  };

  const handleDelete = () => {
    if (!selectedItem) return;
    showConfirm('Are you sure you want to delete this?', async () => {
      if (selectedItem.type === 'module') {
        await deleteModule(selectedItem.id);
      } else {
        await deleteLesson(selectedItem.id);
      }
      setSelectedItem(null);
      loadData();
    });
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12 px-6 font-inter selection:bg-[#ea1f27] selection:text-white">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8 border-b-2 border-white/20 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-ndot tracking-widest mb-2 uppercase break-words">System_Admin</h1>
            <p className="text-[#666] text-xs font-mono uppercase tracking-wider">Manage platform analytics and curriculum.</p>
          </div>
          
          {/* Tabs */}
          <div className="flex flex-wrap sm:flex-nowrap bg-transparent border-2 border-white/20 rounded-none p-1">
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-widest rounded-none transition-colors ${activeTab === 'analytics' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
            >
              <LayoutDashboard size={14} />
              Analytics
            </button>
            <button 
              onClick={() => setActiveTab('curriculum')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-widest rounded-none transition-colors ${activeTab === 'curriculum' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
            >
              <ListTree size={14} />
              Curriculum CMS
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-widest rounded-none transition-colors ${activeTab === 'users' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
            >
              <Users size={14} />
              User Mgmt
            </button>
            <button 
              onClick={() => setActiveTab('content')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-widest rounded-none transition-colors ${activeTab === 'content' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
            >
              <UploadCloud size={14} />
              Content Importer
            </button>
          </div>
        </div>

        {/* ── Analytics Tab (Real Data) ── */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {loadingStats || !stats ? (
              <div className="flex flex-col items-center justify-center h-[500px] text-white/50 space-y-4">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                <p className="font-geist tracking-widest text-sm uppercase">Aggregating Real-Time Data...</p>
              </div>
            ) : (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="col-span-1 md:col-span-2">
                    <LiveClockWidget />
                  </div>
                  
                  {/* Nothing OS Widget 1 */}
                  <div className="bg-black border-2 border-white/20 p-6 rounded-none flex flex-col justify-between shadow-none">
                    <div className="flex justify-between items-start mb-6">
                      <span className="text-white/50 text-xs font-geist uppercase tracking-widest">Total Students</span>
                      <Users size={16} className="text-white/50" />
                    </div>
                    <div>
                      <p className="text-5xl font-ndot tracking-wider">{stats.totalStudents}</p>
                      <p className="text-xs text-[#ea1f27] mt-2 font-mono uppercase tracking-wider">↑ +{stats.newStudentsMonth} THIS MONTH</p>
                    </div>
                  </div>
                  
                  {/* Nothing OS Widget 2 */}
                  <div className="bg-black border-2 border-white/20 p-6 rounded-none flex flex-col justify-between shadow-none">
                    <div className="flex justify-between items-start mb-6">
                      <span className="text-white/50 text-xs font-geist uppercase tracking-widest">Est. Revenue</span>
                      <DollarSign size={16} className="text-white/50" />
                    </div>
                    <div>
                      <p className="text-4xl font-ndot tracking-wider">${stats.estimatedRevenue.toLocaleString()}</p>
                      <p className="text-xs text-white/40 mt-2 font-mono uppercase tracking-wider">ACTIVE * PRICE</p>
                    </div>
                  </div>

                  {/* Nothing OS Widget 3 */}
                  <div className="bg-black border-2 border-dashed border-[#ea1f27]/50 p-6 rounded-none flex flex-col justify-between shadow-none">
                    <div className="flex justify-between items-start mb-6">
                      <span className="text-[#ea1f27] text-xs font-geist uppercase tracking-widest">Active Enrollments</span>
                      <Activity size={16} className="text-[#ea1f27]" />
                    </div>
                    <div>
                      <p className="text-5xl font-ndot tracking-wider text-[#ea1f27]">{stats.activeEnrollments}</p>
                      <p className="text-xs text-[#ea1f27]/60 mt-2 font-mono uppercase tracking-wider">SYSTEM ONLINE</p>
                    </div>
                  </div>

                  {/* Nothing OS Widget 4 */}
                  <div className="bg-black border-2 border-white/20 p-6 rounded-none flex flex-col justify-between shadow-none">
                    <div className="flex justify-between items-start mb-6">
                      <span className="text-white/50 text-xs font-geist uppercase tracking-widest">Avg Completion</span>
                      <BookOpen size={16} className="text-white/50" />
                    </div>
                    <div>
                      <p className="text-5xl font-ndot tracking-wider">
                        {stats.moduleProgress.length > 0 
                          ? Math.round(stats.moduleProgress.reduce((a: any, b: any) => a + b.completionRate, 0) / stats.moduleProgress.length) 
                          : 0}%
                      </p>
                      <div className="w-full h-1 bg-[#333] mt-3">
                        <div className="h-full bg-white" style={{width: `${stats.moduleProgress.length > 0 ? Math.round(stats.moduleProgress.reduce((a: any, b: any) => a + b.completionRate, 0) / stats.moduleProgress.length) : 0}%`}} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Student Growth Area Chart */}
                  <div className="lg:col-span-2 bg-black border-2 border-white/20 p-6 rounded-none">
                    <h3 className="text-sm font-geist text-white mb-6 uppercase tracking-widest">Student Growth</h3>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.studentGrowth}>
                          <CartesianGrid strokeDasharray="2 2" stroke="#333" vertical={false} />
                          <XAxis dataKey="name" stroke="#666" tick={{fill: '#666', fontFamily: 'Inter', fontSize: 10}} axisLine={false} tickLine={false} />
                          <YAxis stroke="#666" tick={{fill: '#666', fontFamily: 'Inter', fontSize: 10}} axisLine={false} tickLine={false} />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#000', border: '2px solid #fff', borderRadius: '0px', fontFamily: 'Inter', textTransform: 'uppercase' }}
                            itemStyle={{ color: '#ea1f27' }}
                          />
                          <Line type="step" dataKey="students" name="REGISTRATIONS" stroke="#ea1f27" strokeWidth={2} dot={{r: 0}} activeDot={{r: 4, fill: '#ea1f27'}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Enrollments Per Course */}
                  <div className="bg-black border-2 border-white/20 p-6 rounded-none flex flex-col">
                    <h3 className="text-sm font-geist text-white mb-6 uppercase tracking-widest">Course Popularity</h3>
                    <div className="flex-1 min-h-[250px]">
                      {stats.enrollmentsPerCourse.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats.enrollmentsPerCourse} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="2 2" stroke="#333" horizontal={true} vertical={false} />
                            <XAxis type="number" stroke="#666" hide />
                            <YAxis dataKey="name" type="category" stroke="#666" width={100} tick={{fill: '#fff', fontSize: 10, fontFamily: 'Inter'}} axisLine={false} tickLine={false} />
                            <RechartsTooltip 
                              cursor={{fill: '#111'}} 
                              contentStyle={{ backgroundColor: '#000', border: '2px solid #fff', borderRadius: '0px', fontFamily: 'Inter', textTransform: 'uppercase' }} 
                            />
                            <Bar dataKey="enrollments" name="ACTIVE" fill="#fff" radius={[0, 0, 0, 0]} barSize={16} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-[#666] font-mono text-xs uppercase">No enrollment data</div>
                      )}
                    </div>
                  </div>

                  {/* Real Learning Progress Stacked Bar Chart */}
                  <div className="lg:col-span-3 bg-black border-2 border-white/20 p-6 rounded-none">
                    <h3 className="text-sm font-geist text-white mb-2 uppercase tracking-widest">Module Completion</h3>
                    <p className="text-[#666] text-xs font-mono mb-6 uppercase">Completed vs. incomplete lessons per module</p>
                    <div className="h-[300px] w-full">
                      {stats.moduleProgress.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats.moduleProgress} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="2 2" stroke="#333" vertical={false} />
                            <XAxis dataKey="name" stroke="#666" tick={{fill: '#666', fontFamily: 'Inter', fontSize: 10}} axisLine={false} tickLine={false} />
                            <YAxis stroke="#666" tick={{fill: '#666', fontFamily: 'Inter', fontSize: 10}} axisLine={false} tickLine={false} />
                            <RechartsTooltip 
                              cursor={{fill: '#111'}} 
                              contentStyle={{ backgroundColor: '#000', border: '2px solid #fff', borderRadius: '0px', fontFamily: 'Inter', textTransform: 'uppercase' }} 
                            />
                            <Bar dataKey="completed" name="COMPLETED" stackId="a" fill="#ea1f27" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="incomplete" name="INCOMPLETE" stackId="a" fill="#333" radius={[0, 0, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-[#666] font-mono text-xs uppercase">No curriculum data</div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Curriculum CMS Tab ── */}
        {activeTab === 'curriculum' && (
          <div className="flex flex-col md:flex-row gap-6 h-auto md:h-[700px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Sidebar Syllabus Tree */}
            <div className="w-full md:w-80 shrink-0 bg-black border-2 border-white/20 rounded-none flex flex-col overflow-hidden">
              <div className="p-4 border-b-2 border-white/20 flex items-center justify-between">
                <h3 className="font-mono text-sm uppercase tracking-widest text-white">Syllabus</h3>
                <button onClick={handleCreateModule} className="p-1.5 bg-white text-black hover:bg-neutral-300 rounded-none transition-colors" title="Add Module">
                  <Plus size={16} />
                </button>
              </div>
              <ScrollArea.Root className="flex-1 overflow-hidden">
                <ScrollArea.Viewport className="w-full h-full p-4">
                  {modules.map(mod => (
                    <div key={mod.id} className="mb-6">
                      <div 
                        className={`flex items-center justify-between p-2 rounded-none cursor-pointer transition-colors ${selectedItem?.id === mod.id ? 'bg-[#ea1f27] text-white' : 'hover:bg-white/10 text-white/70'}`}
                        onClick={() => handleSelectItem('module', mod.id)}
                      >
                        <span className="font-semibold text-sm uppercase tracking-wider">{mod.title}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleCreateLesson(mod.id); }} className="text-white/40 hover:text-white p-1">
                          <Plus size={14} />
                        </button>
                      </div>
                      
                      <div className="pl-4 mt-2 border-l-2 border-dashed border-[#333] space-y-1">
                        {mod.lessons.map(lesson => (
                          <div 
                            key={lesson.id} 
                            onClick={() => handleSelectItem('lesson', lesson.id)}
                            className={`flex items-center gap-2 p-2 rounded-none cursor-pointer text-xs font-mono uppercase tracking-wider transition-colors ${selectedItem?.id === lesson.id ? 'bg-white text-black' : 'hover:bg-white/10 text-[#888] hover:text-white'}`}
                          >
                            <BookOpen size={14} className="flex-shrink-0" />
                            <span className="truncate">{lesson.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </ScrollArea.Viewport>
                <ScrollArea.Scrollbar orientation="vertical" className="w-1.5 bg-black"><ScrollArea.Thumb className="bg-white/20 rounded-full" /></ScrollArea.Scrollbar>
              </ScrollArea.Root>
            </div>

            {/* Main Editor Panel */}
            <div className="flex-1 bg-black border-2 border-white/20 rounded-none flex flex-col overflow-hidden">
              {!selectedItem ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[#333]">
                  <Edit2 size={48} className="mb-4" />
                  <p className="font-mono uppercase tracking-widest text-sm">Select node to edit</p>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  {/* Editor Header */}
                  <div className="p-4 border-b-2 border-white/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono px-2 py-1 border border-white/20 text-white/60 uppercase tracking-widest">
                        {selectedItem.type}
                      </span>
                      <input 
                        type="text" 
                        value={editForm.title || ''} 
                        onChange={e => setEditForm({...editForm, title: e.target.value})}
                        className="bg-transparent border-none text-2xl font-ndot tracking-widest focus:outline-none focus:ring-0 text-white w-96 placeholder-white/20 uppercase"
                        placeholder="ENTER TITLE..."
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 border-2 border-[#ea1f27] hover:bg-[#ea1f27] text-[#ea1f27] hover:text-white text-xs font-mono uppercase tracking-widest rounded-none transition-colors">
                        <Trash2 size={14} /> Delete
                      </button>
                      <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-neutral-300 font-mono text-xs uppercase tracking-widest rounded-none transition-colors disabled:opacity-50">
                        <Save size={14} /> {saving ? 'SAVING...' : 'SAVE CHANGES'}
                      </button>
                    </div>
                  </div>

                  {/* Editor Body */}
                  <ScrollArea.Root className="flex-1 overflow-hidden">
                    <ScrollArea.Viewport className="w-full h-full p-6">
                      <div className="space-y-6">
                        
                        <div>
                          <label className="block text-xs font-mono text-white/50 uppercase tracking-widest mb-2">Order Index</label>
                          <input 
                            type="number" 
                            value={editForm.order_index || 0}
                            onChange={e => setEditForm({...editForm, order_index: parseInt(e.target.value)})}
                            className="bg-black border-2 border-white/20 rounded-none px-3 py-2 text-white w-32 focus:border-white focus:outline-none font-mono"
                          />
                        </div>

                        {selectedItem.type === 'lesson' && (
                          <>
                            <div>
                              <label className="block text-xs font-mono text-white/50 uppercase tracking-widest mb-2">Markdown Content</label>
                              <textarea 
                                value={editForm.content_markdown || ''}
                                onChange={e => setEditForm({...editForm, content_markdown: e.target.value})}
                                className="w-full h-[300px] bg-black border-2 border-white/20 rounded-none p-4 text-white font-mono text-sm leading-relaxed focus:border-white focus:outline-none resize-none"
                                placeholder="# Lesson Heading..."
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-mono text-white/50 uppercase tracking-widest mb-2">Starter Code (Monaco Editor)</label>
                              <div className="h-[400px] rounded-none overflow-hidden border-2 border-white/20">
                                <CodeEditor 
                                  initialValue={editForm.starter_code || ''}
                                  language="javascript"
                                  onChange={val => setEditForm({...editForm, starter_code: val})}
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </ScrollArea.Viewport>
                    <ScrollArea.Scrollbar orientation="vertical" className="w-1.5 bg-black"><ScrollArea.Thumb className="bg-white/20 rounded-none" /></ScrollArea.Scrollbar>
                  </ScrollArea.Root>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── Users Tab (User Management) ── */}
        {activeTab === 'users' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-black border-2 border-white/20 p-6 rounded-none">
            <h2 className="text-xl font-ndot tracking-widest mb-6 uppercase border-b-2 border-white/10 pb-4">User Management</h2>
            
            {/* Mobile Card View */}
            <div className="grid grid-cols-1 gap-4 sm:hidden">
              {allProfiles.map((p) => (
                <div key={p.id} className="border-2 border-white/10 p-4 flex flex-col gap-4 bg-white/[0.02]">
                  <div className="flex items-center gap-4">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="avatar" className="w-12 h-12 rounded-full border border-white/20 object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-eb-garamond text-lg text-white shrink-0">
                        {p.display_name ? p.display_name[0].toUpperCase() : 'U'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-white truncate font-medium text-sm">{p.display_name || 'No Name Set'}</div>
                      <div className="text-white/30 text-xs mt-1 truncate" title={p.id}>{p.id}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <select 
                      value={p.role || 'student'} 
                      onChange={(e) => handleRoleChange(p.id, e.target.value)}
                      className="bg-black border border-white/20 text-white text-xs font-mono uppercase tracking-widest p-2 cursor-pointer focus:outline-none focus:border-[#ea1f27]"
                    >
                      <option value="student">Student</option>
                      <option value="instructor">Instructor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button 
                      onClick={() => handleAdminEnroll(p.id)}
                      className="px-4 py-2 bg-transparent border border-white/20 text-white text-xs font-mono uppercase tracking-widest hover:border-white hover:bg-white/10 transition-colors rounded-none"
                    >
                      Enroll
                    </button>
                  </div>
                </div>
              ))}
              {allProfiles.length === 0 && (
                <div className="py-8 text-center text-white/50 font-mono text-xs tracking-widest uppercase">
                  No profiles found
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left font-inter text-sm">
                <thead>
                  <tr className="border-b-2 border-white/20 text-white/50 font-mono text-xs uppercase tracking-widest">
                    <th className="pb-3 px-4">Avatar</th>
                    <th className="pb-3 px-4">Name / ID</th>
                    <th className="pb-3 px-4">Role</th>
                    <th className="pb-3 px-4">Joined</th>
                    <th className="pb-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allProfiles.map((p) => (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-4">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="avatar" className="w-8 h-8 rounded-full border border-white/20 object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-eb-garamond text-xs text-white">
                            {p.display_name ? p.display_name[0].toUpperCase() : 'U'}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-white">{p.display_name || 'No Name Set'}</div>
                        <div className="text-white/30 text-[10px] sm:text-xs mt-1 truncate max-w-[100px] sm:max-w-[200px]" title={p.id}>{p.id}</div>
                      </td>
                      <td className="py-4 px-4">
                        <select 
                          value={p.role || 'student'} 
                          onChange={(e) => handleRoleChange(p.id, e.target.value)}
                          className="bg-transparent border border-white/20 text-white text-[10px] sm:text-xs font-mono uppercase tracking-widest p-1 cursor-pointer focus:outline-none focus:border-[#ea1f27]"
                        >
                          <option value="student" className="bg-black text-white">Student</option>
                          <option value="instructor" className="bg-black text-white">Instructor</option>
                          <option value="admin" className="bg-black text-white">Admin</option>
                        </select>
                      </td>
                      <td className="py-4 px-4 text-white/50 font-mono text-xs">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button 
                          onClick={() => handleAdminEnroll(p.id)}
                          className="px-3 py-1 bg-transparent border border-white/20 text-white text-xs font-mono uppercase tracking-widest hover:border-white hover:bg-white/10 transition-colors rounded-none"
                        >
                          Enroll
                        </button>
                      </td>
                    </tr>
                  ))}
                  {allProfiles.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-white/50 font-mono text-xs tracking-widest uppercase">
                        No profiles found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Content Importer Tab ── */}
        {activeTab === 'content' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#050505] border-2 border-white/10 p-8 rounded-none">
              <h2 className="text-2xl font-ndot mb-4">Content Importer</h2>
              <p className="text-white/50 font-mono text-sm mb-6 max-w-3xl leading-relaxed">Paste your course JSON payload below to bulk import courses, modules, lessons, and quizzes into the platform. This operation is idempotent and will safely update existing records without creating duplicates.</p>
              
              <div className="space-y-4">
                <textarea 
                  id="import-json-payload"
                  className="w-full h-[500px] bg-black border border-white/20 p-4 text-white font-mono text-sm focus:border-white/50 outline-none resize-y"
                  placeholder='{ "slug": "python-qa", "title": "Python for QA Testers", "modules": [ ... ] }'
                ></textarea>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={async () => {
                      const el = document.getElementById('import-json-payload') as HTMLTextAreaElement;
                      if (!el || !el.value) return;
                      try {
                        const parsed = JSON.parse(el.value);
                        const { importCourseContent } = await import('../lib/contentImporter');
                        const result = await importCourseContent(parsed);
                        if (result.success) {
                          showAlert(result.message);
                          el.value = '';
                          loadData(); // reload curriculum
                        } else {
                          showAlert('Error: ' + result.message);
                        }
                      } catch (e: any) {
                        showAlert('Invalid JSON format: ' + e.message);
                      }
                    }}
                    className="px-6 py-2 bg-white text-black font-mono text-sm uppercase tracking-widest hover:bg-neutral-200 transition-colors"
                  >
                    Execute Import
                  </button>
                  <button 
                    onClick={() => {
                      const el = document.getElementById('import-json-payload') as HTMLTextAreaElement;
                      if (el) {
                        el.value = JSON.stringify({
                          slug: "python-qa",
                          title: "Python for QA Testers",
                          description: "Master automated testing with Python.",
                          modules: [
                            {
                              title: "UI Automation with Selenium",
                              lessons: [
                                {
                                  title: "Automated Login Test",
                                  description: "Write your first Selenium test.",
                                  content_markdown: "## Automated Login Test\n\nIn this lesson, we will automate a login page.",
                                  starter_code: "const { Builder, By } = require('selenium-webdriver');\n\n// Write test here",
                                  quiz_data: {
                                    id: "login-q1",
                                    type: "multiple-choice",
                                    question: "Which WebDriver method locates an element by ID?",
                                    options: ["findElement(By.id())", "getElement()", "querySelector()"],
                                    correctIndex: 0,
                                    explanation: "By.id() is the preferred locator when a unique ID is available."
                                  }
                                }
                              ]
                            }
                          ]
                        }, null, 2);
                      }
                    }}
                    className="px-6 py-2 border border-white/20 text-white font-mono text-sm uppercase tracking-widest hover:bg-white/5 transition-colors"
                  >
                    Load Sample JSON
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Custom Create Modal ── */}
      {createModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-in fade-in duration-200 p-4">
          <div className="bg-black border-2 border-white/20 rounded-none w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl shadow-[#ea1f27]/10">
            <div className="p-6">
              <h2 className="text-2xl font-ndot tracking-widest mb-2 text-white uppercase">
                Create {createModal.type === 'module' ? 'Module' : 'Lesson'}
              </h2>
              <p className="text-[#888] text-xs font-mono uppercase tracking-widest mb-6">
                System entry required.
              </p>
              
              <div className="space-y-4 font-mono">
                <div>
                  <label className="block text-xs font-mono text-white/50 uppercase tracking-widest mb-2">Title</label>
                  <input 
                    type="text" 
                    autoFocus
                    value={createInput}
                    onChange={e => setCreateInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitCreate()}
                    placeholder="ENTER TITLE..."
                    className="w-full bg-black border-2 border-white/20 rounded-none px-4 py-3 text-white focus:border-[#ea1f27] focus:outline-none transition-colors uppercase tracking-widest"
                  />
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t-2 border-white/20 flex justify-end gap-3">
              <button 
                onClick={() => setCreateModal({ ...createModal, isOpen: false })}
                className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-[#888] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={submitCreate}
                disabled={saving || !createInput.trim()}
                className="px-6 py-2 bg-white text-black text-xs font-mono uppercase tracking-widest rounded-none hover:bg-[#ea1f27] hover:text-white transition-colors disabled:opacity-50"
              >
                {saving ? '...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Alert Dialog ── */}
      {alertDialog?.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 animate-in fade-in duration-200 p-4">
          <div className="bg-black border-2 border-white/20 rounded-none w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl shadow-white/5">
            <div className="p-6">
              <h2 className="text-xl font-ndot tracking-widest mb-4 text-white uppercase">Notification</h2>
              <p className="text-white/70 font-mono text-sm leading-relaxed">{alertDialog.message}</p>
            </div>
            <div className="p-4 border-t-2 border-white/20 flex justify-end">
              <button 
                onClick={() => setAlertDialog(null)}
                className="px-6 py-2 bg-white text-black text-xs font-mono uppercase tracking-widest rounded-none hover:bg-[#ea1f27] hover:text-white transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Confirm Dialog ── */}
      {confirmDialog?.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 animate-in fade-in duration-200 p-4">
          <div className="bg-black border-2 border-[#ea1f27]/50 rounded-none w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl shadow-[#ea1f27]/10">
            <div className="p-6">
              <h2 className="text-xl font-ndot tracking-widest mb-4 text-[#ea1f27] uppercase">Confirm Action</h2>
              <p className="text-white/70 font-mono text-sm leading-relaxed">{confirmDialog.message}</p>
            </div>
            <div className="p-4 border-t-2 border-[#ea1f27]/20 flex justify-end gap-3">
              <button 
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-[#888] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setConfirmDialog(null);
                  confirmDialog.onConfirm();
                }}
                className="px-6 py-2 bg-[#ea1f27] text-white text-xs font-mono uppercase tracking-widest rounded-none hover:bg-red-600 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
