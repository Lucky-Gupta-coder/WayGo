import WayGoLogo, { type LogoMarkSize } from './WayGoLogo'

interface OcarLogoMarkProps {
  size?: LogoMarkSize
  className?: string
}

export default function OcarLogoMark({ size = 'md', className }: OcarLogoMarkProps) {
  return <WayGoLogo size={size} className={className} />
}
