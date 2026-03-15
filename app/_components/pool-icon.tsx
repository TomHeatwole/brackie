interface PoolIconProps {
  imageUrl?: string | null;
  poolName?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-16 h-16",
};

const emojiSizes = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-3xl",
};

export default function PoolIcon({
  imageUrl,
  poolName,
  size = "sm",
  className = "",
}: PoolIconProps) {
  const sizeClass = sizeClasses[size];

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={poolName ?? "Pool icon"}
        className={`${sizeClass} rounded-lg object-cover shrink-0 ${className}`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-lg flex items-center justify-center shrink-0 bg-card border border-card-border ${className}`}
    >
      <span className={emojiSizes[size]}>🏆</span>
    </div>
  );
}
