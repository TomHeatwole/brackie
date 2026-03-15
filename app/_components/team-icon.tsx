import { Team } from "@/lib/types";

interface TeamIconProps {
  team: Pick<Team, "name" | "icon_url">;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const sizeClasses = {
  xs: "w-4 h-4 text-[8px]",
  sm: "w-5 h-5 text-[10px]",
  md: "w-6 h-6 text-xs",
};

export default function TeamIcon({
  team,
  size = "sm",
  className = "",
}: TeamIconProps) {
  const initial = (team.name ?? "?")[0].toUpperCase();
  const sizeClass = sizeClasses[size];

  if (team.icon_url) {
    return (
      <img
        src={team.icon_url}
        alt=""
        role="presentation"
        className={`${sizeClass} rounded-full object-contain shrink-0 bg-white/5 ${className}`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white shrink-0 bg-accent ${className}`}
      aria-hidden
    >
      {initial}
    </div>
  );
}
