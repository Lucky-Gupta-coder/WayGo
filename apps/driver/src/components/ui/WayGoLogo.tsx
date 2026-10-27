import React from 'react'
import { cn } from '@/lib/utils'

export type LogoMarkSize = 'sm' | 'md' | 'lg' | 'xl'

interface WayGoLogoProps {
  size?: LogoMarkSize
  className?: string
  withWordmark?: boolean
  wordmarkClassName?: string
}

const ICON_SIZE_PX: Record<LogoMarkSize, number> = {
  sm: 24,
  md: 32,
  lg: 44,
  xl: 56,
}

const TEXT_SIZE_CLASS: Record<LogoMarkSize, string> = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
}

export function WayGoIcon({ size = 32, className, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      aria-label="WayGo Icon"
      role="img"
      className={cn('flex-shrink-0', className)}
      {...props}
    >
      <defs>
        <linearGradient id="waygo-brand-grad-driver" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="waygo-road-grad-driver" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#EEF2FF" />
        </linearGradient>
      </defs>

      {/* Rounded badge base */}
      <rect width="48" height="48" rx="14" fill="url(#waygo-brand-grad-driver)" />

      {/* Stylized W road path */}
      <path
        d="M10 15.5L16.2 34C16.5 35 17.5 35.6 18.5 35.5C19.5 35.4 20.3 34.7 20.6 33.7L24 22L27.4 33.7C27.7 34.7 28.5 35.4 29.5 35.5C30.5 35.6 31.5 35 31.8 34L38 15.5"
        stroke="url(#waygo-road-grad-driver)"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Location pin head dot */}
      <circle cx="24" cy="13.5" r="3.5" fill="#FFFFFF" />
      <circle cx="24" cy="13.5" r="1.5" fill="#4F46E5" />
    </svg>
  )
}

export default function WayGoLogo({
  size = 'md',
  className,
  withWordmark = true,
  wordmarkClassName,
}: WayGoLogoProps) {
  const iconPx = ICON_SIZE_PX[size]
  const textClass = TEXT_SIZE_CLASS[size]

  return (
    <div className={cn('inline-flex items-center gap-2.5', className)} aria-label="WayGo">
      <WayGoIcon size={iconPx} />
      {withWordmark && (
        <span
          className={cn(
            'font-black tracking-tight leading-none flex items-center',
            textClass,
            wordmarkClassName
          )}
        >
          <span className="text-text-primary">Way</span>
          <span className="text-primary text-[#4F46E5]">Go</span>
        </span>
      )}
    </div>
  )
}
