import React from 'react'
import { cn } from '@/lib/utils'

interface WayGoIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number
  className?: string
  title?: string
}

export function WayGoIcon({
  size = 36,
  className,
  title = 'WayGo Icon',
  ...props
}: WayGoIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      aria-label={title}
      role="img"
      className={cn('flex-shrink-0', className)}
      {...props}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id="waygo-brand-grad-comp" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="waygo-road-grad-comp" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#EEF2FF" />
        </linearGradient>
      </defs>

      {/* Rounded badge base */}
      <rect width="48" height="48" rx="14" fill="url(#waygo-brand-grad-comp)" />

      {/* Stylized W road path */}
      <path
        d="M10 15.5L16.2 34C16.5 35 17.5 35.6 18.5 35.5C19.5 35.4 20.3 34.7 20.6 33.7L24 22L27.4 33.7C27.7 34.7 28.5 35.4 29.5 35.5C30.5 35.6 31.5 35 31.8 34L38 15.5"
        stroke="url(#waygo-road-grad-comp)"
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

interface WayGoLogoProps {
  iconSize?: number
  className?: string
  badgeText?: string
  wordmarkClassName?: string
}

export function WayGoLogo({
  iconSize = 36,
  className,
  badgeText,
  wordmarkClassName,
}: WayGoLogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)} aria-label="WayGo">
      <WayGoIcon size={iconSize} />
      <div className="flex items-center">
        <span
          className={cn(
            'text-text-primary font-black tracking-tight text-xl leading-none flex items-center',
            wordmarkClassName
          )}
        >
          <span>Way</span>
          <span className="text-primary">Go</span>
        </span>
        {badgeText && (
          <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-primary-light text-primary">
            {badgeText}
          </span>
        )}
      </div>
    </div>
  )
}
