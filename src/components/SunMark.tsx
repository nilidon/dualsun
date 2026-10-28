export function SunMark({ className }: { className?: string }) {
  const rays = Array.from({ length: 16 }, (_, index) => {
    const angle = (index / 16) * Math.PI * 2;
    const inner = 15;
    const outer = 28;
    return {
      x1: 32 + Math.cos(angle) * inner,
      y1: 32 + Math.sin(angle) * inner,
      x2: 32 + Math.cos(angle) * outer,
      y2: 32 + Math.sin(angle) * outer,
    };
  });

  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.4">
        {rays.map((ray) => (
          <line key={`${ray.x2}-${ray.y2}`} x1={ray.x1} y1={ray.y1} x2={ray.x2} y2={ray.y2} />
        ))}
        <circle cx="32" cy="32" r="10" />
      </g>
      <circle cx="32" cy="32" r="4" fill="currentColor" />
    </svg>
  );
}
