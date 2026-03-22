"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountPanel } from "./AccountPanel";
import { Diamond, List, X } from "@phosphor-icons/react";
import { useChainlinkPrice } from "@/lib/hooks/useChainlinkPrice";

const NAV_LINKS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/builder", label: "Builder" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: avaxPrice } = useChainlinkPrice("AVAX/USD");

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div
        className={`border-b transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-sm border-[var(--border-light)] shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
            : "bg-white border-[var(--border-light)]"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Left: Logo */}
            <Link href="/" className="flex items-center gap-2">
              <Diamond className="w-6 h-6 text-[var(--primary)]" weight="fill" />
              <span className="text-lg font-bold text-[var(--text-primary)]">Avalon</span>
            </Link>

            {/* Center: Nav Links (desktop) */}
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

            {/* Right: Price + Wallet + Hamburger */}
            <div className="flex items-center gap-2 sm:gap-3">
              {avaxPrice && (
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-light)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-live-dot" />
                  <span className="text-[11px] text-[var(--text-secondary)]">AVAX</span>
                  <span className="text-[11px] font-semibold font-mono text-[var(--text-primary)] animate-price-flash">
                    ${avaxPrice.price.toFixed(2)}
                  </span>
                </div>
              )}
              <AccountPanel />
              {/* Hamburger (mobile only) */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 -mr-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <List className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-[var(--border-light)] shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          <nav className="max-w-6xl mx-auto px-4 py-3 space-y-1">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "text-[var(--text-primary)] bg-[var(--surface-hover)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
            {avaxPrice && (
              <div className="flex items-center gap-2 px-3 py-2 text-[12px] text-[var(--text-tertiary)]">
                AVAX <span className="font-mono font-semibold text-[var(--text-primary)]">${avaxPrice.price.toFixed(2)}</span>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
