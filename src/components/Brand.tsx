type BrandProps = {
  variant?: 'sidebar' | 'auth'
}

export function Brand({ variant = 'sidebar' }: BrandProps) {
  return (
    <div className={`brand brand-${variant}`} aria-label="cook.now">
      <img src="/logo.png" alt="" className="brand-logo" width={34} height={34} />
      <span className="brand-name">
        cook<span className="brand-dot">.</span>now
      </span>
    </div>
  )
}
