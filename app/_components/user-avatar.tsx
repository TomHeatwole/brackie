interface UserAvatarProps {
  avatarUrl?: string | null;
  username?: string | null;
  email?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-16 h-16 text-2xl",
};

export default function UserAvatar({
  avatarUrl,
  username,
  email,
  size = "sm",
  className = "",
}: UserAvatarProps) {
  const initial = (username ?? email ?? "?")[0].toUpperCase();
  const sizeClass = sizeClasses[size];

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username ?? "User avatar"}
        className={`${sizeClass} rounded-full object-cover shrink-0 ${className}`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white shrink-0 bg-accent ${className}`}
    >
      {initial}
    </div>
  );
}
