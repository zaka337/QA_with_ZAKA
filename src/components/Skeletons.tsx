import { Skeleton } from './ui/skeleton';

/**
 * Generic app-shell skeleton — shown while auth state resolves (route
 * guards) or a lazy route chunk is fetching. Doesn't know the destination
 * page yet, so it approximates the site's general nav + content layout
 * rather than any specific page.
 */
export function AppLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="h-20 px-6 md:px-[5vw] flex items-center justify-between border-b border-white/5">
        <Skeleton className="h-8 w-8 rounded-sm" />
        <div className="hidden md:flex gap-8">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-9 w-28 rounded" />
      </div>
      <div className="max-w-6xl mx-auto px-6 pt-16 space-y-6">
        <Skeleton className="h-9 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}

function CourseCardSkeleton() {
  return (
    <div className="border border-white/10 bg-white/[0.02] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-5 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

/** Matches the Dashboard's header + "All Materials" course card grid. */
export function DashboardSkeleton() {
  return (
    <div className="pt-32 pb-24 min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-10 w-64" />
          </div>
          <Skeleton className="h-6 w-40 rounded-full" />
        </header>
        <Skeleton className="h-6 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <CourseCardSkeleton />
          <CourseCardSkeleton />
          <CourseCardSkeleton />
        </div>
      </div>
    </div>
  );
}

/** Matches CoursePlayer's syllabus sidebar + main lesson content area. */
export function CoursePlayerSkeleton() {
  return (
    <div className="h-screen w-screen bg-black flex flex-col">
      <div className="h-16 px-6 flex items-center justify-between border-b border-white/10 shrink-0">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 p-8 space-y-4 overflow-hidden">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-64 w-full mt-6" />
        </div>
        <div className="hidden md:block w-80 border-l border-white/10 p-4 space-y-6 shrink-0">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Matches the Admin analytics tab's KPI tiles + charts grid. */
export function AdminAnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Skeleton className="col-span-1 md:col-span-2 h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-[350px]" />
        <Skeleton className="h-[350px]" />
      </div>
    </div>
  );
}

/** Matches the Admin curriculum tab's module/lesson tree while switching courses. */
export function CurriculumTreeSkeleton() {
  return (
    <div className="p-4 space-y-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <div className="pl-4 space-y-2">
            <Skeleton className="h-6 w-5/6" />
            <Skeleton className="h-6 w-4/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Matches Settings' avatar + profile form layout. */
export function SettingsSkeleton() {
  return (
    <div className="pt-32 pb-24 min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-2xl mx-auto px-6">
        <Skeleton className="h-9 w-48 mb-12" />
        <div className="flex items-center gap-6 mb-12">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="space-y-6 p-8 bg-white/[0.02] border border-white/5">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
