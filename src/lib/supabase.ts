import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables! Data fetching will fail.');
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

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB — matches the avatars bucket's server-side limit

/** Upload an avatar to Supabase Storage. Throws a descriptive error on failure
 *  or rejection so callers can surface it, instead of silently keeping the old avatar. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    throw new Error('Please upload a JPEG, PNG, WebP, or GIF image.');
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('Image must be 5MB or smaller.');
  }

  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}-${Math.random()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file);

  if (uploadError) {
    throw new Error(`Avatar upload failed: ${uploadError.message}`);
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

export type CourseAccess = {
  course: Course;
  hasFullAccess: boolean;
  enrolledAt: string | null;
};

/**
 * Every published course, with a flag for whether this user has full paid
 * access (lifetime/monthly plan, or an explicit enrollment grant) versus
 * free-preview access (first module only — enforced in CoursePlayer).
 * Previously getEnrollments() returned nothing at all for free-plan users
 * with no admin-granted enrollment, so their Dashboard showed zero courses.
 */
export async function getCoursesWithAccess(userId: string): Promise<CourseAccess[]> {
  const [{ data: profile }, { data: courses }, { data: enrollments }] = await Promise.all([
    supabase.from('profiles').select('plan').eq('id', userId).single(),
    supabase.from('courses').select('*').eq('is_published', true),
    supabase.from('enrollments').select('course_id, enrolled_at').eq('user_id', userId),
  ]);

  const isPaidPlan = profile?.plan === 'lifetime' || profile?.plan === 'monthly';
  const enrollmentMap = new Map((enrollments ?? []).map((e: any) => [e.course_id, e.enrolled_at]));

  return (courses ?? []).map((course: any) => ({
    course,
    hasFullAccess: isPaidPlan || enrollmentMap.has(course.id),
    enrolledAt: enrollmentMap.get(course.id) ?? null,
  }));
}

/** Whether a specific user has full (paid) access to a course, vs free-preview access. */
export async function hasFullCourseAccess(userId: string, courseId: string): Promise<boolean> {
  const [{ data: profile }, { data: enrollment }] = await Promise.all([
    supabase.from('profiles').select('plan').eq('id', userId).single(),
    supabase.from('enrollments').select('id').eq('user_id', userId).eq('course_id', courseId).maybeSingle(),
  ]);
  return profile?.plan === 'lifetime' || profile?.plan === 'monthly' || !!enrollment;
}

/** Auto-enroll user in a course (used for demo / after payment) */
export async function enrollInCourse(userId: string, courseId: string) {
  const { error } = await supabase
    .from('enrollments')
    .upsert({ user_id: userId, course_id: courseId }, { onConflict: 'user_id,course_id' });
  return !error;
}

/**
 * Fetch a full course curriculum (modules + lessons). Lessons are read from
 * the lessons_secure view, not the raw table — it nulls out
 * content_markdown/starter_code/solution_code/quiz_data server-side for any
 * lesson the querying user doesn't actually have access to (see
 * supabase_secure_lesson_content.sql), so a locked lesson's real content
 * never reaches the browser at all, regardless of what the UI does with it.
 * Admins reading this same function still see everything, since the view's
 * gating already accounts for private.is_admin().
 *
 * Queried as two separate calls (modules, then lessons_secure by module_id)
 * rather than a nested embed — PostgREST's automatic FK-based embedding
 * isn't reliably supported through a view.
 */
export async function getCourseCurriculum(courseId: string): Promise<Module[]> {
  const { data: modules } = await supabase
    .from('modules')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index');

  if (!modules || modules.length === 0) return [];

  const moduleIds = modules.map((m: any) => m.id);

  // Falls back to the raw table if lessons_secure doesn't exist yet (i.e.
  // supabase_secure_lesson_content.sql hasn't been run in this environment)
  // so deploying this code doesn't depend on migration order — it just
  // degrades to the previous (unrestricted) behavior until the view exists.
  let lessonsResult = await supabase
    .from('lessons_secure')
    .select('*')
    .in('module_id', moduleIds)
    .order('order_index');

  if (lessonsResult.error) {
    console.warn('lessons_secure view unavailable, falling back to raw lessons table:', lessonsResult.error.message);
    lessonsResult = await supabase
      .from('lessons')
      .select('*')
      .in('module_id', moduleIds)
      .order('order_index');
  }

  const safeLessons = (lessonsResult.data ?? []) as Lesson[];

  return modules.map((m: any) => ({
    ...m,
    lessons: safeLessons
      .filter((l) => l.module_id === m.id)
      .sort((a, b) => a.order_index - b.order_index),
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

/**
 * Records a privileged admin action (role change, manual enrollment, etc.)
 * for accountability. Best-effort: a logging failure should never block the
 * underlying action, so callers should fire-and-forget or swallow errors.
 */
export async function logAdminAction(
  actorId: string,
  action: string,
  targetUserId: string | null,
  metadata?: Record<string, unknown>
) {
  const { error } = await supabase
    .from('admin_audit_log')
    .insert({ actor_id: actorId, action, target_user_id: targetUserId, metadata: metadata ?? null });
  if (error) console.error('Failed to write audit log entry:', error.message);
}

export type AdminAuditLogEntry = {
  id: string;
  actor_id: string;
  action: string;
  target_user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export async function getAdminAuditLog(limit = 50): Promise<AdminAuditLogEntry[]> {
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getRealAdminStats(monthsBack: number | 'all' = 6) {
  // Fetch all required data in parallel
  const [
    { data: profiles },
    { data: enrollments },
    { data: courses },
    { data: modules },
    { data: lessons },
    { data: progress }
  ] = await Promise.all([
    supabase.from('profiles').select('id, created_at'),
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

  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Growth data: grouped by month. Label includes the year ("Aug '26") so
  // ranges longer than 12 months don't collide two Augusts into one bucket —
  // the previous version keyed purely by month name, which was silently
  // wrong for anything beyond a 12-month window.
  const growthMap: Record<string, number> = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthLabel = (d: Date) => `${monthNames[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
  const monthOrder: string[] = [];

  const earliestSignup = safeProfiles.reduce<Date | null>((min, p: any) => {
    if (!p.created_at) return min;
    const d = new Date(p.created_at);
    return !min || d < min ? d : min;
  }, null);

  const rangeMonths = monthsBack === 'all'
    ? (earliestSignup
        ? Math.max(0, (now.getFullYear() - earliestSignup.getFullYear()) * 12 + (now.getMonth() - earliestSignup.getMonth()))
        : 0)
    : monthsBack - 1;

  for (let i = rangeMonths; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = monthLabel(d);
    monthOrder.push(label);
    growthMap[label] = 0;
  }

  safeProfiles.forEach((p: any) => {
    const createdAt = p.created_at ? new Date(p.created_at) : null;
    if (createdAt) {
      if (createdAt >= today) newStudentsToday++;
      if (createdAt >= thisWeek) newStudentsWeek++;
      if (createdAt >= thisMonth) newStudentsMonth++;

      const label = monthLabel(createdAt);
      if (label in growthMap) growthMap[label] += 1;
    }
  });

  const studentGrowth = monthOrder.map(k => ({ name: k, students: growthMap[k] }));

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
  //
  // This aggregates modules across every course at once, so a short label
  // needs to disambiguate which course a module belongs to — "M1" alone
  // collides across all 4 courses, each of which has its own "Module 1".
  const COURSE_SHORT_CODES: Record<string, string> = {
    python: 'PY',
    selenium: 'SEL',
    playwright: 'PW',
    appium: 'APM',
  };

  const shortCourseCode = (title: string) => {
    const key = Object.keys(COURSE_SHORT_CODES).find(k => title.toLowerCase().includes(k));
    return key ? COURSE_SHORT_CODES[key] : title.slice(0, 3).toUpperCase();
  };

  // Chart axis space is tight even before multiplying by 4 courses' worth of
  // modules, so the label drops the descriptive suffix entirely ("Module 5:
  // Visual Testing, Debugging & CI" -> "PW M5") — the full title is still
  // available via the tooltip data if ever needed.
  const shortModuleNumber = (title: string) => {
    const match = title.match(/Module\s*(\d+)/i);
    return match ? `M${match[1]}` : title.slice(0, 10);
  };

  const moduleStatsMap: Record<string, { title: string; completed: number; total: number }> = {};

  safeModules.forEach((m: any) => {
    const course = safeCourses.find((c: any) => c.id === m.course_id);
    const courseCode = course ? shortCourseCode(course.title) : '';
    const shortTitle = shortModuleNumber(m.title);
    moduleStatsMap[m.id] = {
      title: courseCode ? `${courseCode} ${shortTitle}` : shortTitle,
      completed: 0,
      total: 0,
    };
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

/* ── Student Records ─────────────────────────────────────── */

export type StudentCourseProgress = {
  courseId: string;
  courseTitle: string;
  completedLessons: number;
  totalLessons: number;
};

export type StudentRecord = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  plan: string;
  role: string;
  created_at: string;
  enrollments: {
    course_id: string;
    plan: string;
    enrolled_at: string;
  }[];
  courseProgress: StudentCourseProgress[];
};

export async function getStudentsWithDetails(): Promise<StudentRecord[]> {
  // Fetch all profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (!profiles || profiles.length === 0) return [];

  // Fetch all enrollments
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('user_id, course_id, plan, enrolled_at');

  // Fetch all courses
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, is_published');

  // Fetch all lessons with module→course join
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, modules!inner(course_id)');

  // Fetch all completed lesson progress
  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('user_id, lesson_id, completed');

  const safeEnrollments = enrollments || [];
  const safeCourses = courses || [];
  const safeLessons = lessons || [];
  const safeProgress = progress || [];

  // Build lesson→course map
  const lessonCourseMap: Record<string, string> = {};
  safeLessons.forEach((l: any) => {
    lessonCourseMap[l.id] = l.modules?.course_id;
  });

  // Build total lessons per course
  const totalLessonsPerCourse: Record<string, number> = {};
  safeLessons.forEach((l: any) => {
    const cid = l.modules?.course_id;
    if (cid) totalLessonsPerCourse[cid] = (totalLessonsPerCourse[cid] || 0) + 1;
  });

  const publishedCourses = safeCourses.filter((c: any) => c.is_published);

  return profiles.map((profile: Profile) => {
    const userEnrollments = safeEnrollments.filter((e: any) => e.user_id === profile.id);
    const userProgress = safeProgress.filter((p: any) => p.user_id === profile.id && p.completed);

    // Lifetime/monthly members get access to every published course automatically
    // (same rule getEnrollments() applies for the student's own Dashboard), so their
    // course list here must include courses added *after* they subscribed, not just
    // literal enrollment rows written at signup/webhook time.
    const isPaidMember = profile.plan === 'lifetime' || profile.plan === 'monthly';
    const effectiveCourses: { course_id: string; plan: string; enrolled_at: string }[] = isPaidMember
      ? publishedCourses.map((c: any) => {
          const existing = userEnrollments.find((e: any) => e.course_id === c.id);
          return {
            course_id: c.id,
            plan: profile.plan,
            enrolled_at: existing?.enrolled_at || profile.created_at,
          };
        })
      : userEnrollments.map((e: any) => ({
          course_id: e.course_id,
          plan: e.plan,
          enrolled_at: e.enrolled_at,
        }));

    const courseProgress: StudentCourseProgress[] = effectiveCourses.map((e) => {
      const course = safeCourses.find((c: any) => c.id === e.course_id);
      const completedLessons = userProgress.filter(
        (p: any) => lessonCourseMap[p.lesson_id] === e.course_id
      ).length;
      return {
        courseId: e.course_id,
        courseTitle: course?.title || 'Unknown Course',
        completedLessons,
        totalLessons: totalLessonsPerCourse[e.course_id] || 0,
      };
    });

    return {
      ...profile,
      enrollments: effectiveCourses,
      courseProgress,
    };
  });
}

/* ── Admin Notifications ─────────────────────────────────── */

export type AdminNotification = {
  id: string;
  type: 'signup' | 'subscription';
  userId: string;
  userName: string | null;
  avatarUrl: string | null;
  plan?: string;
  timestamp: string;
};

export async function getAdminNotifications(): Promise<AdminNotification[]> {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, plan, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('user_id, plan, enrolled_at, profiles(display_name, avatar_url)')
    .in('plan', ['lifetime', 'monthly'])
    .order('enrolled_at', { ascending: false })
    .limit(100);

  const notifications: AdminNotification[] = [];

  // Sign-up notifications
  (profiles || []).forEach((p: any) => {
    notifications.push({
      id: `signup-${p.id}`,
      type: 'signup',
      userId: p.id,
      userName: p.display_name,
      avatarUrl: p.avatar_url,
      timestamp: p.created_at,
    });
  });

  // Subscription notifications
  (enrollments || []).forEach((e: any) => {
    notifications.push({
      id: `sub-${e.user_id}-${e.plan}-${e.enrolled_at}`,
      type: 'subscription',
      userId: e.user_id,
      userName: e.profiles?.display_name || null,
      avatarUrl: e.profiles?.avatar_url || null,
      plan: e.plan,
      timestamp: e.enrolled_at,
    });
  });

  // Sort newest first
  return notifications.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
