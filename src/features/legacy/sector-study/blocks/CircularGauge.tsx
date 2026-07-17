import React from 'react'

export interface CircularGaugeProps {
  score: number
  className?: string
  size?: number // size in pixels
  strokeWidth?: number
  showLabel?: boolean
  fontSizeClass?: string
  subfontSizeClass?: string
}

/**
 * CircularGauge - A premium SVG-based donut gauge for displaying Attractiveness Score out of 5.0.
 * Zero external dependencies. Uses Tailwind CSS variables.
 * Rotation applied to start at 12 o'clock.
 */
export function CircularGauge({
  score,
  className = '',
  size = 80,
  strokeWidth = 3.5,
  showLabel = true,
  fontSizeClass = 'text-xl',
  subfontSizeClass = 'text-[8px]',
}: CircularGaugeProps) {
  const clamped = Math.max(0, Math.min(5, score))
  
  // Radius calculation
  const radius = 16
  const viewBoxSize = 36
  const center = viewBoxSize / 2
  
  // Circumference = 2 * PI * r = 2 * 3.14159 * 16 = 100.531
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (clamped / 5) * circumference

  return (
    <div 
      className={`relative flex flex-col items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      aria-label={`Score d'attractivité: ${score.toFixed(1)} sur 5`}
    >
      <svg
        className="w-full h-full transform -rotate-90 origin-center"
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      >
        {/* Track circle (Background) */}
        <circle
          className="stroke-white/10"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle (Foreground) */}
        <circle
          className="stroke-secondary transition-all duration-500 ease-out"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      
      {/* Centered Score text */}
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white font-sans">
          <span className={`font-black leading-none tracking-tight ${fontSizeClass}`}>
            {score.toFixed(1)}
          </span>
          <span className={`font-bold uppercase tracking-wider text-white/60 mt-0.5 ${subfontSizeClass}`}>
            / 5.0
          </span>
        </div>
      )}
    </div>
  )
}
