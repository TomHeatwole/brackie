import UserMenu from "./user-menu";

const NAV_TABS = [
  { label: "Dashboard", href: "/" },
  { label: "Brackets", href: "/brackets" },
  { label: "Pools", href: "/pools" },
];

interface NavbarProps {
  userEmail?: string | null;
  activeTab?: string;
}

export default function Navbar({ userEmail, activeTab = "Dashboard" }: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex h-12 items-center justify-between bg-stone-950 px-4 shadow-lg border-b border-stone-800">
      {/* Brand */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-bold text-lg leading-none select-none" style={{ color: "#AE4E02" }}>[ ]</span>
        <span className="text-white font-semibold text-base tracking-tight">brackie</span>
      </div>

      {/* Nav tabs */}
      <div className="flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
        {NAV_TABS.map((tab) => {
          const isActive = tab.label === activeTab;
          return (
            <a
              key={tab.label}
              href={tab.href}
              className={`px-3 text-sm transition-colors ${
                isActive
                  ? "text-white pb-[10px] pt-[12px] border-b-2"
                  : "text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded py-1.5"
              }`}
              style={isActive ? { borderBottomColor: "#AE4E02" } : undefined}
            >
              {tab.label}
            </a>
          );
        })}
      </div>

      {/* User menu */}
      <div className="shrink-0">
        {userEmail && <UserMenu userEmail={userEmail} />}
      </div>
    </nav>
  );
}
