import { cn } from '#/lib/utils'

/**
 * AZVFIT — "AZV" em amarelo/dourado, "FIT" em azul, halter substituindo o "I".
 * Regra da identidade visual: nada de cor hardcoded fora dos tokens semânticos.
 */
export function Logo({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl'
  const barHeight = size === 'sm' ? 14 : size === 'lg' ? 24 : 18

  return (
    <span className={cn('inline-flex items-center font-extrabold tracking-tight', textSize, className)}>
      <span className="text-accent">AZV</span>
      <span className="text-primary">F</span>
      <svg
        viewBox="0 0 20 24"
        width={barHeight * 0.8}
        height={barHeight}
        className="mx-0.5 shrink-0 text-primary"
        aria-hidden="true"
      >
        <rect x="8.5" y="0" width="3" height="24" rx="1.5" fill="currentColor" />
        <rect x="1" y="4" width="4" height="16" rx="1.5" fill="currentColor" />
        <rect x="15" y="4" width="4" height="16" rx="1.5" fill="currentColor" />
        <rect x="0" y="8" width="6" height="8" rx="1.5" fill="currentColor" opacity="0.6" />
        <rect x="14" y="8" width="6" height="8" rx="1.5" fill="currentColor" opacity="0.6" />
      </svg>
      <span className="text-primary">T</span>
    </span>
  )
}
