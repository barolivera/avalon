"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountPanel } from "./AccountPanel";
import { Diamond } from "@phosphor-icons/react";
import { useChainlinkPrice } from "@/lib/hooks/useChainlinkPrice";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/builder", label: "Builder" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const { data: avaxPrice } = useChainlinkPrice("AVAX/USD");

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div
        className={`border-b transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-sm border-[var(--border-light)] shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
            : "bg-white border-[var(--border-light)]"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            {/* Left: Logo */}
            <Link href="/" className="flex items-center gap-2">
              <Diamond className="w-6 h-6 text-[var(--primary)]" weight="fill" />
              <span className="text-lg font-bold text-[var(--text-primary)]">Avalon</span>
            </Link>

            {/* Center: Nav Links */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map(({ href, label }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "text-[var(--text-primary)] bg-[var(--surface-hover)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Right: Price + Wallet */}
            <div className="flex items-center gap-3">
              {avaxPrice && (
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-light)]">
                  <span className="text-[11px] text-[var(--text-secondary)]">AVAX</span>
                  <span className="text-[11px] font-semibold font-mono text-[var(--text-primary)]">
                    ${avaxPrice.price.toFixed(2)}
                  </span>
                </div>
              )}
              <AccountPanel />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
