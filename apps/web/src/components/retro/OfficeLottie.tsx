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
        className={`flex items-center justify-center rounded-[28px] border border-border bg-secondary/70 text-[11px] uppercase tracking-[0.28em] text-muted-foreground ${className ?? ''}`}
      >
        Loading scene
      </div>
    );
  }

  return <Lottie animationData={animationData} loop={loop} className={className} />;
}
