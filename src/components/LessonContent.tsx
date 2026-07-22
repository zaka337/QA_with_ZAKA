import ReactMarkdown from 'react-markdown';
import { QuizBlock } from './QuizBlock';
import type { QuizQuestion } from './QuizBlock';

interface LessonContentProps {
  content: string;
  quiz?: QuizQuestion | null;
  onQuizSuccess?: () => void;
}

export function LessonContent({ content, quiz, onQuizSuccess }: LessonContentProps) {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-12 text-white/90 font-inter font-light">
      <div className="prose prose-invert prose-base sm:prose-lg max-w-none 
        prose-headings:font-eb-garamond prose-headings:font-normal prose-headings:text-white
        prose-a:text-white prose-a:underline-offset-4 prose-a:decoration-white/30 hover:prose-a:decoration-white
        prose-code:text-white/90 prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-[#050505] prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl
        prose-strong:font-medium prose-strong:text-white
        prose-blockquote:border-l-white/20 prose-blockquote:bg-white/[0.02] prose-blockquote:py-1 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
      ">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>

      {quiz && (
        <div className="mt-16 pt-8 border-t border-white/10">
          <QuizBlock quiz={quiz} onSuccess={onQuizSuccess} />
        </div>
      )}
    </div>
  );
}
