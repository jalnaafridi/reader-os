"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Library, User, Trophy } from "lucide-react";

const TABS = [
  { href: "/learn",     icon: Home,     label: "Home"     },
  { href: "/library",   icon: Library,  label: "Library"  },
  { href: "/lesson",    icon: BookOpen, label: "Read"     },
  { href: "/profile",   icon: User,     label: "Identity" },
  { href: "/community", icon: Trophy,   label: "Compete"  },
] as const;

export function MobileNav() {
  const path = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-page-darker z-50 h-16 flex safe-area-inset-bottom">
      {TABS.map(tab => {
        const active = path === tab.href || path.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
              active
                ? "text-violet"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <tab.icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
