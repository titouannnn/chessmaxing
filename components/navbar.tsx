"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Explorer", href: "/" },
    { label: "Analyse", href: "/analysis" },
  ];

  return (
    <nav className="fixed top-6 w-full z-50 flex justify-center px-4">
      <div className="flex items-center gap-8 px-10 h-14 bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-full shadow-2xl">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "font-manrope tracking-widest text-[11px] uppercase transition-all duration-300",
              pathname === item.href
                ? "text-white font-bold"
                : "text-stone-500 hover:text-white"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
