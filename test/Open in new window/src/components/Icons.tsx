type IconProps = { className?: string };

export function ArrowIcon({ direction = "right" }: { direction?: "left" | "right" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="arrow-icon">
      {direction === "right" ? (
        <>
          <path d="M3.5 10h12" />
          <path d="m10.5 5 5 5-5 5" />
        </>
      ) : (
        <>
          <path d="M16.5 10h-12" />
          <path d="m9.5 5-5 5 5 5" />
        </>
      )}
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={className ?? "answer-state-icon"}>
      <path d="m4.5 10.5 3.7 3.7 7.6-8" />
    </svg>
  );
}

export function CrossIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={className ?? "answer-state-icon"}>
      <path d="m6 6 8 8M14 6l-8 8" />
    </svg>
  );
}

export function RestartIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="restart-icon">
      <path d="M16.2 8a6.4 6.4 0 1 0 .1 4" />
      <path d="M16 3.8v4.5h-4.5" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="close-icon">
      <path d="m5.5 5.5 9 9M14.5 5.5l-9 9" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="lock-icon">
      <rect x="4.5" y="8.5" width="11" height="7.5" rx="1.6" />
      <path d="M7.4 8.5V6.6a2.6 2.6 0 0 1 5.2 0v1.9" />
    </svg>
  );
}
