import { supabase } from './supabase';


export interface QuizQuestion {
  id: string;
  type: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LessonImportData {
  title: string;
  description: string;
  content_markdown: string;
  starter_code?: string;
  solution_code?: string;
  quiz_data?: QuizQuestion | null;
  duration?: string;
  resources?: any; // JSON for external links/files
}

export interface ModuleImportData {
  title: string;
  lessons: LessonImportData[];
}

export interface CourseImportData {
  slug: string;
  title: string;
  description: string;
  thumbnail_url?: string;
  modules: ModuleImportData[];
}

/**
 * Idempotent Content Importer
 * Safely upserts a Course -> Modules -> Lessons structure.
 */
export async function importCourseContent(courseData: CourseImportData) {
  try {
    // 1. Upsert Course by slug
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .upsert({
        slug: courseData.slug,
        title: courseData.title,
        description: courseData.description,
        thumbnail_url: courseData.thumbnail_url
      }, { onConflict: 'slug' })
      .select('*')
      .single();

    if (courseError) throw new Error(`Course import failed: ${courseError.message}`);
    
    let moduleOrder = 1;

    // 2. Iterate and upsert Modules
    for (const modData of courseData.modules) {
      // Upsert module based on course_id + title to prevent duplicates
      const { data: moduleRecord } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', course.id)
        .eq('title', modData.title)
        .maybeSingle();
      
      let moduleId = moduleRecord?.id;

      if (!moduleId) {
        const { data: newMod, error: createModErr } = await supabase
          .from('modules')
          .insert({
            course_id: course.id,
            title: modData.title,
            order_index: moduleOrder
          })
          .select('id')
          .single();
        if (createModErr) throw new Error(`Module creation failed: ${createModErr.message}`);
        moduleId = newMod.id;
      } else {
        // Update order if needed
        await supabase.from('modules').update({ order_index: moduleOrder }).eq('id', moduleId);
      }

      moduleOrder++;
      let lessonOrder = 1;

      // 3. Iterate and upsert Lessons
      for (const lessonData of modData.lessons) {
        // Upsert based on module_id + title
        const { data: existingLesson } = await supabase
          .from('lessons')
          .select('id')
          .eq('module_id', moduleId)
          .eq('title', lessonData.title)
          .maybeSingle();

        const lessonPayload = {
          module_id: moduleId,
          title: lessonData.title,
          description: lessonData.description,
          content_markdown: lessonData.content_markdown,
          starter_code: lessonData.starter_code || null,
          solution_code: lessonData.solution_code || null,
          quiz_data: lessonData.quiz_data || null,
          duration: lessonData.duration || null,
          order_index: lessonOrder
        };

        if (existingLesson) {
          await supabase.from('lessons').update(lessonPayload).eq('id', existingLesson.id);
        } else {
          await supabase.from('lessons').insert(lessonPayload);
        }
        
        lessonOrder++;
      }
    }

    return { success: true, message: `Successfully imported: ${courseData.title}` };
  } catch (error: any) {
    console.error('Content Import Error:', error);
    return { success: false, message: error.message };
  }
}
