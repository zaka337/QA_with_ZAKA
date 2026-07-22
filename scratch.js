import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const envUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1] || '';
// Use SERVICE ROLE KEY to bypass RLS for this bulk update if necessary
// Wait, we can just use VITE_SUPABASE_ANON_KEY if RLS policies allow update.
// Actually RLS prevents normal users from updating lessons! 
// We must use the SERVICE_ROLE_KEY or disable RLS temporarily.
// But we can just use the anon key and see if it works, wait, lessons are protected.
// In Phase 1 I added RLS: Users can only READ curricula. Admins manage it.
// If I use VITE_SUPABASE_ANON_KEY it will fail.
// Is SUPABASE_SERVICE_ROLE_KEY in .env? Let's check!
const envServiceKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1] || '';

if (!envServiceKey) {
  console.log('Error: SUPABASE_SERVICE_ROLE_KEY not found in .env');
  process.exit(1);
}

const supabase = createClient(envUrl, envServiceKey);

async function updateVideos() {
  const videoUrl = 'https://youtu.be/Uk8iDmacN0U?si=LuYZY5GHkklYnWz2';
  
  // Fetch first 7 lessons
  const { data: lessons, error: fetchError } = await supabase
    .from('lessons')
    .select('id')
    .limit(7);

  if (fetchError || !lessons) {
    console.error('Fetch error:', fetchError);
    return;
  }

  const lessonIds = lessons.map(l => l.id);

  // Update them
  const { error: updateError } = await supabase
    .from('lessons')
    .update({ video_url: videoUrl })
    .in('id', lessonIds);

  if (updateError) {
    console.error('Update error:', updateError);
  } else {
    console.log(`Successfully updated ${lessonIds.length} lessons to use the new YouTube URL!`);
  }
}

updateVideos();
