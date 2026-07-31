import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

interface AnimatedHeroProps {
  /** Static text before the rotating word, e.g. "Master the" */
  prefix?: string;
  /** Words that rotate through, e.g. ["Craft", "Skillset"] */
  words?: string[];
  /** Supporting paragraph below the headline */
  description?: string;
  className?: string;
}

function AnimatedHero({
  prefix = "Master the",
  words = ["Craft", "Toolchain", "Automation", "Career"],
  description = "Gain full access to the complete roadmap, premium video courses, and an exclusive alumni community.",
  className = "",
}: AnimatedHeroProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const stableWords = useMemo(() => words, [words]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setActiveIndex((prev) => (prev === stableWords.length - 1 ? 0 : prev + 1));
    }, 2200);
    return () => clearTimeout(timeoutId);
  }, [activeIndex, stableWords]);

  return (
    <div className={`flex flex-col items-center text-center max-w-3xl mx-auto ${className}`}>
      <h1 className="font-eb-garamond text-4xl md:text-6xl tracking-tight text-white">
        <span>{prefix} </span>
        <span className="relative inline-flex h-[1.15em] w-[1em] min-w-[7ch] justify-center overflow-hidden align-bottom md:min-w-[6ch]">
          {stableWords.map((word, index) => (
            <motion.span
              key={word}
              className="absolute font-semibold text-[#C9A96E]"
              initial={{ opacity: 0, y: -40 }}
              transition={{ type: "spring", stiffness: 60, damping: 14 }}
              animate={
                activeIndex === index
                  ? { y: 0, opacity: 1 }
                  : { y: activeIndex > index ? -40 : 40, opacity: 0 }
              }
            >
              {word}
            </motion.span>
          ))}
        </span>
      </h1>

      {description && (
        <p className="mt-6 font-inter font-light text-lg text-white/60 leading-relaxed max-w-2xl">
          {description}
        </p>
      )}
    </div>
  );
}

export { AnimatedHero };
