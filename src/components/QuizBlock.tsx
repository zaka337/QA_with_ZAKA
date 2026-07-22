import { useState } from 'react';
import { Check, X } from 'lucide-react';
import gsap from 'gsap';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizBlockProps {
  quiz: QuizQuestion;
  onSuccess?: () => void;
}

export function QuizBlock({ quiz, onSuccess }: QuizBlockProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const isCorrect = selected === quiz.correctIndex;

  const handleSubmit = () => {
    if (selected === null) return;
    setIsSubmitted(true);
    
    if (selected === quiz.correctIndex) {
      // Trigger a mini success animation
      gsap.fromTo('.quiz-success', { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' });
      if (onSuccess) onSuccess();
    } else {
      // Trigger a shake animation
      gsap.fromTo('.quiz-error', { x: -10 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' });
    }
  };

  return (
    <div className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-4 sm:p-8 my-8 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.02] rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />

      <h3 className="font-eb-garamond text-xl sm:text-2xl text-white/90 mb-4 sm:mb-6">Knowledge Check</h3>
      <p className="font-inter font-light text-white/80 mb-6 sm:mb-8 text-base sm:text-lg">{quiz.question}</p>

      <div className="space-y-3 mb-8">
        {quiz.options.map((option, idx) => {
          const isSelected = selected === idx;
          const showAsCorrect = isSubmitted && idx === quiz.correctIndex;
          const showAsIncorrect = isSubmitted && isSelected && !isCorrect;

          return (
            <button
              key={idx}
              disabled={isSubmitted && isCorrect}
              onClick={() => {
                setSelected(idx);
                setIsSubmitted(false);
              }}
              className={`
                w-full text-left px-4 py-3 sm:px-6 sm:py-4 rounded-lg border transition-all duration-300 font-inter font-light flex items-center justify-between gap-3
                ${isSelected && !isSubmitted ? 'border-white/40 bg-white/10 text-white' : 'border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/5 hover:border-white/20'}
                ${showAsCorrect ? '!border-green-500/50 !bg-green-500/10 !text-green-400' : ''}
                ${showAsIncorrect ? '!border-red-500/50 !bg-red-500/10 !text-red-400 quiz-error' : ''}
              `}
            >
              <span className="break-all sm:break-normal break-words overflow-hidden text-sm sm:text-base">{option}</span>
              {showAsCorrect && <Check className="w-5 h-5 text-green-400" />}
              {showAsIncorrect && <X className="w-5 h-5 text-red-400" />}
            </button>
          );
        })}
      </div>

      {!isSubmitted || !isCorrect ? (
        <button
          onClick={handleSubmit}
          disabled={selected === null || (isSubmitted && isCorrect)}
          className="px-8 py-3 bg-white text-black font-inter font-medium text-sm tracking-wide rounded hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Check Answer
        </button>
      ) : null}

      {isSubmitted && (
        <div className={`mt-6 p-4 rounded-lg border ${isCorrect ? 'quiz-success border-green-500/20 bg-green-500/5 text-green-200' : 'quiz-error border-red-500/20 bg-red-500/5 text-red-200'}`}>
          <h4 className="font-medium mb-1 font-inter flex items-center gap-2">
            {isCorrect ? <><Check className="w-4 h-4"/> Correct!</> : <><X className="w-4 h-4"/> Not quite.</>}
          </h4>
          <p className="font-light text-sm opacity-80">{isCorrect ? quiz.explanation : 'Try again! Think about the core principles we just discussed.'}</p>
        </div>
      )}
    </div>
  );
}
