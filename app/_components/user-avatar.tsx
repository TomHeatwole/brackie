interface UserAvatarProps {
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-16 h-16 text-2xl",
};

function getInitial(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  const first = firstName?.trim()[0];
  const last = lastName?.trim()[0];
  if (first) return first.toUpperCase();
  if (last) return last.toUpperCase();
  if (email?.trim()) return email.trim()[0].toUpperCase();
  return "?";
}

export default function UserAvatar({
  avatarUrl,
  firstName,
  lastName,
  email,
  size = "sm",
  className = "",
}: UserAvatarProps) {
  const initial = getInitial(firstName, lastName, email);
  const sizeClass = sizeClasses[size];
  const displayName = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ") || "User avatar";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
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
