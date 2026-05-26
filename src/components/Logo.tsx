'use client'
import Image from 'next/image'

type LogoProps = {
  size?:    'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'icon'           // full = logo + texte, icon = logo seul
  style?:   React.CSSProperties
}

const sizes = {
  sm: { img: 28, fontSize: 14, gap: 8  },
  md: { img: 36, fontSize: 17, gap: 10 },
  lg: { img: 52, fontSize: 22, gap: 12 },
  xl: { img: 80, fontSize: 32, gap: 16 },
}

export default function Logo({ size = 'md', variant = 'full', style }: LogoProps) {
  const s = sizes[size]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: s.gap, ...style }}>
      <Image
        src="/logo.png"
        alt="Pegazus"
        width={s.img}
        height={s.img}
        style={{ objectFit: 'contain', borderRadius: 6 }}
        priority
      />
      {variant === 'full' && (
        <div>
          <div style={{
            fontFamily:    "'Syne', sans-serif",
            fontSize:      s.fontSize,
            fontWeight:    700,
            color:         '#d4a843',
            letterSpacing: '.05em',
            lineHeight:    1.1,
          }}>
            PEGAZUS
          </div>
          {size !== 'sm' && (
            <div style={{
              fontSize:      s.fontSize * 0.52,
              color:         '#5a677d',
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              marginTop:     1,
            }}>
              Trading AI Platform
            </div>
          )}
        </div>
      )}
    </div>
  )
}
