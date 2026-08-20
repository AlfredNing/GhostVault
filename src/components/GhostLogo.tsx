/**
 * GhostVault brand mark — a minimal ghost-shaped lock.
 *
 * Direction: ghost silhouette + lock keyhole, single calm accent color.
 * No skulls, no shields, no hacker aesthetics.
 */
export function GhostLogo({
  className,
  size = 48,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* ghost body */}
      <path
        d="M24 6c-8.284 0-15 6.716-15 15v17.5c0 1.35 1.62 2.05 2.6 1.12l2.32-2.2a2.1 2.1 0 0 1 2.9 0l2.28 2.18a2.1 2.1 0 0 0 2.9 0l2.55-2.44a2.1 2.1 0 0 1 2.9 0l2.55 2.44a2.1 2.1 0 0 0 2.9 0l2.28-2.18a2.1 2.1 0 0 1 2.9 0l2.32 2.2c.98.93 2.6.23 2.6-1.12V21c0-8.284-6.716-15-15-15Z"
        fill="url(#gv-ghost-fill)"
      />
      {/* keyhole */}
      <circle cx="24" cy="22" r="4" fill="var(--gv-keyhole, #09090b)" />
      <path
        d="M22.4 24.5h3.2l1.1 6.5a1.2 1.2 0 0 1-1.18 1.4h-3.04a1.2 1.2 0 0 1-1.18-1.4l1.1-6.5Z"
        fill="var(--gv-keyhole, #09090b)"
      />
      <defs>
        <linearGradient
          id="gv-ghost-fill"
          x1="9"
          y1="6"
          x2="39"
          y2="42"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#a5b4fc" />
          <stop offset="1" stopColor="#818cf8" />
        </linearGradient>
      </defs>
    </svg>
  );
}
