export function AchillesMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 52 52"
      role="img"
      aria-label="Achilles helmet emblem"
      className={className}
    >
      <path
        d="M15 40.5c2.5-3 4-6.7 4-11.1V19.2c0-5.3 3.1-9.4 8.3-11.7 3 4.5 4.3 8.8 4.1 13.1h7.8l-4.4 6.2-3.8.2c-1.6 7.5-6.9 12.2-16 13.5Z"
        fill="currentColor"
      />
      <path
        d="M23.5 19.4c4.7-1 8.6-4.7 10.5-9.3M20.3 35.5h9.2"
        fill="none"
        stroke="var(--paper)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
