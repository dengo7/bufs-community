interface Props {
  nickname: string;
  avatarUrl: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Avatar({ nickname, avatarUrl, size = 'md', className = '' }: Props) {
  const sizeClass = { sm: 'w-6 h-6', md: 'w-7 h-7', lg: 'w-8 h-8' }[size];
  const px = { sm: 24, md: 28, lg: 32 }[size];

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        width={px}
        height={px}
        className={`rounded-full object-cover shrink-0 ${sizeClass} ${className}`}
        alt={nickname}
      />
    );
  }

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 40 40"
      className={`rounded-full shrink-0 ${sizeClass} ${className}`}
    >
      <circle cx="20" cy="20" r="20" fill="#EFF6FF" />
      <circle cx="20" cy="15" r="9" fill="#93C5FD" />
      <ellipse cx="20" cy="34" rx="13" ry="9" fill="#93C5FD" />
    </svg>
  );
}
