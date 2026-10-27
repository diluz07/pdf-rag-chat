import React from 'react';

/**
 * ThrobbingOrb
 * A round, spherical AI orb that smoothly throbs and breathes with
 * soft ambient glow and specular curvature, with NO dot in the center.
 */
export default function ThrobbingOrb({ size = 'md', isThinking = false, className = '' }) {
  const isSmall = size === 'sm';
  const outerSize = isSmall ? 'w-6 h-6' : 'w-8 h-8';
  const sphereSize = isSmall ? 'w-5 h-5' : 'w-7 h-7';

  const animThrob = isThinking ? 'animate-orb-throb-fast' : 'animate-orb-throb';
  const animHalo = isThinking ? 'animate-orb-halo-fast' : 'animate-orb-halo';

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${outerSize} ${className} select-none`}
      title={isThinking ? 'AI Thinking...' : 'AI Assistant'}
    >
      {/* 1. Soft outer breathing halo / pulse aura */}
      <span
        className={`absolute inset-0 rounded-full ${animHalo} blur-[2px] transition-all bg-zinc-400/25 dark:bg-zinc-500/30`}
      />

      {/* 2. Middle soft radial ambient glow */}
      <span
        className={`absolute inset-1 rounded-full ${animThrob} blur-[1px] bg-gradient-to-r from-zinc-300/35 via-zinc-400/30 to-zinc-300/35 dark:from-zinc-600/30 dark:via-zinc-400/25 dark:to-zinc-600/30`}
      />

      {/* 3. Spherical Round Orb Body (NO center dot) */}
      <div
        className={`relative ${sphereSize} rounded-full ${animThrob} flex items-center justify-center overflow-hidden shadow-xs border border-zinc-300/90 dark:border-zinc-700/80 bg-gradient-to-tr from-zinc-200 via-white to-zinc-300 dark:from-zinc-950 dark:via-zinc-800 dark:to-zinc-700`}
      >
        {/* Specular curved reflection highlight at top-left */}
        <div className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-white dark:bg-zinc-200 opacity-90 blur-[0.6px]" />

        {/* Ambient bottom depth shade */}
        <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-zinc-400/40 dark:bg-black/80 blur-[1px]" />
      </div>
    </div>
  );
}
