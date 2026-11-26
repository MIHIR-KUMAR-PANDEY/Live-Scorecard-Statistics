export function TrophyIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

export function HeapsTreeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="5" r="2.2" />
      <circle cx="6.5" cy="13" r="2" />
      <circle cx="17.5" cy="13" r="2" />
      <circle cx="4" cy="20" r="1.5" />
      <circle cx="9" cy="20" r="1.5" />
      <path d="M10.4 6.8 7.8 11.2" />
      <path d="M13.6 6.8 16.2 11.2" />
      <path d="M5.6 14.9 4.5 18.5" />
      <path d="M7.4 14.9 8.5 18.5" />
    </svg>
  );
}

export function StopwatchIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5" />
      <path d="M9 2h6" />
      <path d="M12 2v3" />
    </svg>
  );
}

export function BarChartIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 3v18h18" />
      <rect x="7" y="12" width="3" height="6" rx="0.5" />
      <rect x="12" y="7" width="3" height="11" rx="0.5" />
      <rect x="17" y="10" width="3" height="8" rx="0.5" />
    </svg>
  );
}

export function ClipboardIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>
  );
}

export function LaurelWreathSvg({ className = 'w-14 h-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 28"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 22C7 18 5 12 7 6M15 24C10 21 8 15 10 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M52 22C57 18 59 12 57 6M49 24C54 21 56 15 54 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.7"
      />
      <ellipse cx="7" cy="11" rx="2.2" ry="1.2" transform="rotate(-25 7 11)" fill="currentColor" opacity="0.6" />
      <ellipse cx="9" cy="17" rx="2.2" ry="1.2" transform="rotate(-40 9 17)" fill="currentColor" opacity="0.6" />
      <ellipse cx="57" cy="11" rx="2.2" ry="1.2" transform="rotate(25 57 11)" fill="currentColor" opacity="0.6" />
      <ellipse cx="55" cy="17" rx="2.2" ry="1.2" transform="rotate(40 55 17)" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

export function MedalIcon({
  tier,
  className = 'w-4 h-4',
}: {
  tier: 'gold' | 'silver' | 'bronze';
  className?: string;
}) {
  const fill =
    tier === 'gold' ? '#F0A93A' : tier === 'silver' ? '#CBD5E1' : '#D97745';
  const stroke =
    tier === 'gold' ? '#92400E' : tier === 'silver' ? '#64748B' : '#7C2D12';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 2h3l1 5H9L8 2Z" fill="#3CC3CF" />
      <path d="M16 2h-3l-1 5h3l1-5Z" fill="#FF5A9A" />
      <circle cx="12" cy="14" r="6" fill={fill} stroke={stroke} strokeWidth="1.6" />
      <circle cx="12" cy="14" r="3" stroke={stroke} strokeWidth="1" opacity="0.6" />
    </svg>
  );
}
