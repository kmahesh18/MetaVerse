'use client';

import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';

interface OfficeLottieProps {
  className?: string;
  loop?: boolean;
}

export function OfficeLottie({ className, loop = true }: OfficeLottieProps) {
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/assets/lottie/office.json')
      .then((response) => response.json())
      .then((json) => {
        if (!cancelled) {
          setAnimationData(json);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAnimationData(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!animationData) {
    return (
      <div
        className={`flex items-center justify-center rounded-[28px] border border-white/10 bg-[#11131c]/70 text-[11px] uppercase tracking-[0.28em] text-[#f4e6be]/55 ${className ?? ''}`}
      >
        Loading scene
      </div>
    );
  }

  return <Lottie animationData={animationData} loop={loop} className={className} />;
}
