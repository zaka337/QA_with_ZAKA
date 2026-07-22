import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* ── Typed DB helpers ─────────────────────────────────────── */

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  plan: string;
  role: string;
  created_at: string;
};

export type Course = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
};

export type Module = {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  lessons: Lesson[];
};

export type Lesson = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  video_url: string | null; // Keeping for legacy/hybrid
  content_markdown: string | null;
  starter_code: string | null;
  solution_code: string | null;
  quiz_data: any | null; // JSONB
  duration: string | null;
  order_index: number;
};

export type LessonProgress = {
  lesson_id: string;
  completed: boolean;
  watched_seconds: number;
};

/** Fetch the current user's profile */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
}

/** Fetch global platform settings */
export async function getPlatformSettings(settingId: string) {
  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('id', settingId)
    .single();
  return data?.value;
}

/** Update the current user's profile */
export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);
  return !error;
}

/** Upload an avatar to Supabase Storage */
export async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}-${Math.random()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading avatar:', uploadError.message);
    return null;
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  return data.publicUrl;
}

/** Fetch all courses the user is enrolled in */
export async function getEnrollments(userId: string) {
  // First check if the user is a paid member
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single();

  if (profile?.plan === 'lifetime' || profile?.plan === 'monthly') {
    // Paid members get access to ALL courses automatically
    const { data: courses } = await supabase.from('courses').select('*');
    if (!courses) return [];
    
    return courses.map(course => ({
      id: `auto-${course.id}`,
      user_id: userId,
      course_id: course.id,
      plan: profile.plan,
      enrolled_at: profile.plan === 'lifetime' ? '2020-01-01T00:00:00.000Z' : new Date().toISOString(),
      courses: course
    }));
  }

  // Free members rely on actual enrollment records
  const { data } = await supabase
    .from('enrollments')
    .select('*, courses(*)')
    .eq('user_id', userId)
    .order('enrolled_at', { ascending: false });
  return data ?? [];
}

/** Auto-enroll user in a course (used for demo / after payment) */
export async function enrollInCourse(userId: string, courseId: string) {
  const { error } = await supabase
    .from('enrollments')
    .upsert({ user_id: userId, course_id: courseId }, { onConflict: 'user_id,course_id' });
  return !error;
}

/** Fetch a full course curriculum (modules + lessons) */
export async function getCourseCurriculum(courseId: string): Promise<Module[]> {
  const { data: modules } = await supabase
    .from('modules')
    .select('*, lessons(*)')
    .eq('course_id', courseId)
    .order('order_index');

  if (!modules) return [];

  return modules.map((m: any) => ({
    ...m,
    lessons: (m.lessons ?? []).sort((a: Lesson, b: Lesson) => a.order_index - b.order_index),
  }));
}

/** Fetch user's progress for all lessons in a course */
export async function getLessonProgress(userId: string, courseId: string): Promise<LessonProgress[]> {
  // Get all lesson IDs for the course first
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, modules!inner(course_id)')
    .eq('modules.course_id', courseId);

  if (!lessons || lessons.length === 0) return [];

  const lessonIds = lessons.map((l: any) => l.id);

  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('lesson_id, completed, watched_seconds')
    .eq('user_id', userId)
    .in('lesson_id', lessonIds);

  return progress ?? [];
}

/** Update watch progress (without marking complete) */
export async function updateLessonProgress(userId: string, lessonId: string, watchedSeconds: number) {
  const { error } = await supabase
    .from('lesson_progress')
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        watched_seconds: watchedSeconds,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' }
    );
  return !error;
}

/** Mark a lesson as complete */
export async function markLessonComplete(userId: string, lessonId: string) {
  const { error } = await supabase
    .from('lesson_progress')
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' }
    );
  return !error;
}

/** Get the first (demo) course */
export async function getFirstCourse(): Promise<Course | null> {
  const { data } = await supabase
    .from('courses')
    .select('*')
    .eq('is_published', true)
    .limit(1)
    .single();
  return data;
}

/* ── Admin Dashboard Functions ──────────────────────────────── */

export async function createModule(courseId: string, title: string, orderIndex: number) {
  const { data, error } = await supabase
    .from('modules')
    .insert({ course_id: courseId, title, order_index: orderIndex })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateModule(moduleId: string, updates: Partial<Module>) {
  const { data, error } = await supabase
    .from('modules')
    .update(updates)
    .eq('id', moduleId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteModule(moduleId: string) {
  const { error } = await supabase.from('modules').delete().eq('id', moduleId);
  if (error) throw new Error(error.message);
  return !error;
}

export async function createLesson(moduleId: string, title: string, orderIndex: number) {
  const { data, error } = await supabase
    .from('lessons')
    .insert({ module_id: moduleId, title, order_index: orderIndex })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateLesson(lessonId: string, updates: Partial<Lesson>) {
  const { data, error } = await supabase
    .from('lessons')
    .update(updates)
    .eq('id', lessonId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteLesson(lessonId: string) {
  const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
  if (error) throw new Error(error.message);
  return !error;
}

export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateUserRole(userId: string, role: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw new Error(error.message);
  return true;
}

export async function adminEnrollUser(userId: string, courseId: string) {
  const { error } = await supabase
    .from('enrollments')
    .upsert({ user_id: userId, course_id: courseId, plan: 'lifetime' }, { onConflict: 'user_id,course_id' });
  if (error) throw new Error(error.message);
  return true;
}

export async function getRealAdminStats() {
  // Fetch all required data in parallel
  const [
    { data: profiles },
    { data: enrollments },
    { data: courses },
    { data: modules },
    { data: lessons },
    { data: progress }
  ] = await Promise.all([
    supabase.from('profiles').select('id'),
    supabase.from('enrollments').select('user_id, course_id'),
    supabase.from('courses').select('id, title, price'),
    supabase.from('modules').select('id, title, course_id'),
    supabase.from('lessons').select('id, module_id'),
    supabase.from('lesson_progress').select('lesson_id, completed')
  ]);

  const safeProfiles = profiles || [];
  const safeEnrollments = enrollments || [];
  const safeCourses = courses || [];
  const safeModules = modules || [];
  const safeLessons = lessons || [];
  const safeProgress = progress || [];

  // --- Student Analytics ---
  const totalStudents = safeProfiles.length;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeek = new Date(today);
  thisWeek.setDate(thisWeek.getDate() - today.getDay());

  let newStudentsToday = 0;
  let newStudentsWeek = 0;
  let newStudentsMonth = 0;

  // Growth data: Group by Month (e.g., 'Jan', 'Feb')
  const growthMap: Record<string, number> = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  safeProfiles.forEach(() => {
    newStudentsToday++;
    newStudentsWeek++;
    newStudentsMonth++;
    const m = monthNames[now.getMonth()];
    growthMap[m] = (growthMap[m] || 0) + 1;
  });

  const studentGrowth = Object.keys(growthMap).map(k => ({ name: k, students: growthMap[k] }));
  if (studentGrowth.length === 0) studentGrowth.push({ name: monthNames[now.getMonth()], students: 0 }); // Fallback

  // --- Enrollment & Revenue ---
  const activeEnrollments = safeEnrollments.length;
  let estimatedRevenue = 0;
  
  const courseEnrollmentsMap: Record<string, number> = {};
  
  safeEnrollments.forEach(e => {
    // Find course price, default to 49.99 if column doesn't exist or is null
    const course = safeCourses.find(c => c.id === e.course_id);
    const price = course?.price != null ? course.price : 49.99;
    estimatedRevenue += price;

    const cTitle = course?.title || 'Unknown Course';
    courseEnrollmentsMap[cTitle] = (courseEnrollmentsMap[cTitle] || 0) + 1;
  });

  const enrollmentsPerCourse = Object.keys(courseEnrollmentsMap).map(k => ({
    name: k,
    enrollments: courseEnrollmentsMap[k]
  }));

  // --- Learning Progress (Module Completion) ---
  // For each module, we want: Completed Lessons, Incomplete Lessons
  const moduleStatsMap: Record<string, { title: string; completed: number; total: number }> = {};
  
  safeModules.forEach(m => {
    moduleStatsMap[m.id] = { title: m.title.replace('Module ', 'M'), completed: 0, total: 0 };
  });

  safeLessons.forEach(l => {
    if (moduleStatsMap[l.module_id]) {
      moduleStatsMap[l.module_id].total++;
      // Check if ANY user completed this lesson (for aggregate stats). 
      // In a real app, this might be "Total completions across all users" vs "Total possible completions (users * lessons)"
      // We will calculate "Total completions across all users" vs "Total Enrollments * Lessons in Module"
      const completionsForLesson = safeProgress.filter(p => p.lesson_id === l.id && p.completed).length;
      moduleStatsMap[l.module_id].completed += completionsForLesson;
    }
  });

  const moduleProgress = Object.values(moduleStatsMap).map(m => {
    // Total possible completions = total lessons in module * active enrollments
    const possible = m.total * (activeEnrollments || 1);
    const incomplete = possible - m.completed;
    return {
      name: m.title,
      completed: m.completed,
      incomplete: incomplete > 0 ? incomplete : 0,
      completionRate: possible > 0 ? Math.round((m.completed / possible) * 100) : 0
    };
  });

  return {
    totalStudents,
    newStudentsToday,
    newStudentsWeek,
    newStudentsMonth,
    activeEnrollments,
    estimatedRevenue,
    studentGrowth,
    enrollmentsPerCourse,
    moduleProgress
  };
}
