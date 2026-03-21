"use client";

import { useState, useMemo } from "react";
import { User, SignOut, WarningCircle, ArrowSquareOut } from "@phosphor-icons/react";
import { useWallet } from "@/lib/genlayer/wallet";
import { error, userRejected } from "@/lib/utils/toast";
import { AddressDisplay } from "./AddressDisplay";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

// ── Wallet icons (inline SVGs — no external deps) ──

function MetaMaskIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21.3 2L13.1 8.2L14.6 4.5L21.3 2Z" fill="#E2761B" stroke="#E2761B" strokeWidth="0.1" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2.7 2L10.8 8.3L9.4 4.5L2.7 2Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.1"/>
      <path d="M18.4 16.8L16.2 20.2L20.8 21.5L22.2 16.9L18.4 16.8Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.1"/>
      <path d="M1.8 16.9L3.2 21.5L7.8 20.2L5.6 16.8L1.8 16.9Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.1"/>
      <path d="M7.5 10.5L6.2 12.5L10.7 12.7L10.5 7.9L7.5 10.5Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.1"/>
      <path d="M16.5 10.5L13.4 7.8L13.3 12.7L17.8 12.5L16.5 10.5Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.1"/>
      <path d="M7.8 20.2L10.4 18.9L8.1 16.9L7.8 20.2Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.1"/>
      <path d="M13.6 18.9L16.2 20.2L15.9 16.9L13.6 18.9Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.1"/>
    </svg>
  );
}

function RabbyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#7C83FF"/>
      <path d="M7 10C7 7.8 8.8 6 11 6H13C15.2 6 17 7.8 17 10V11C17 12.1 16.1 13 15 13H9C7.9 13 7 12.1 7 11V10Z" fill="white" fillOpacity="0.9"/>
      <ellipse cx="10" cy="10" rx="1" ry="1.2" fill="#7C83FF"/>
      <ellipse cx="14" cy="10" rx="1" ry="1.2" fill="#7C83FF"/>
      <path d="M8 13.5C8 13.5 9.5 16 12 16C14.5 16 16 13.5 16 13.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M6 8.5C5 7.5 4.5 9 5 10.5" stroke="white" strokeWidth="1" strokeLinecap="round"/>
      <path d="M18 8.5C19 7.5 19.5 9 19 10.5" stroke="white" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

function CoinbaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#0052FF"/>
      <circle cx="12" cy="12" r="7" fill="white"/>
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" fill="#0052FF"/>
    </svg>
  );
}

function GenericWalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="5" width="20" height="14" rx="3" stroke="#9CA3AF" strokeWidth="1.5" fill="none"/>
      <path d="M2 9H22" stroke="#9CA3AF" strokeWidth="1.5"/>
      <circle cx="18" cy="14" r="1.5" fill="#9CA3AF"/>
    </svg>
  );
}

// ── Wallet definitions ──

interface WalletOption {
  id: string;
  name: string;
  icon: typeof MetaMaskIcon;
  detectKey: string;
  installUrl: string;
}

const WALLETS: WalletOption[] = [
  { id: "metamask", name: "MetaMask", icon: MetaMaskIcon, detectKey: "isMetaMask", installUrl: "https://metamask.io" },
  { id: "rabby", name: "Rabby", icon: RabbyIcon, detectKey: "isRabby", installUrl: "https://rabby.io" },
  { id: "coinbase", name: "Coinbase Wallet", icon: CoinbaseIcon, detectKey: "isCoinbaseWallet", installUrl: "https://www.coinbase.com/wallet" },
];

function detectWallets(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  const eth = (window as any).ethereum;
  if (!eth) return {};
  return {
    metamask: !!eth.isMetaMask,
    rabby: !!eth.isRabby,
    coinbase: !!eth.isCoinbaseWallet,
    any: true,
  };
}

// ── Component ──

export function AccountPanel() {
  const {
    address,
    isConnected,
    isMetaMaskInstalled,
    isOnCorrectNetwork,
    isLoading,
    connectWallet,
    disconnectWallet,
    switchWalletAccount,
  } = useWallet();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const detected = useMemo(() => detectWallets(), [isModalOpen]);
  const hasAnyWallet = detected.any ?? false;
  const installedWallets = WALLETS.filter((w) => detected[w.id]);
  const notInstalledWallets = WALLETS.filter((w) => !detected[w.id]);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setConnectionError("");
      await connectWallet();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Failed to connect wallet:", err);
      setConnectionError(err.message || "Failed to connect");
      if (err.message?.includes("rejected") || err.code === 4001) {
        userRejected("Connection cancelled");
      } else {
        error("Failed to connect wallet", {
          description: err.message || "Check your wallet and try again.",
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setIsModalOpen(false);
  };

  const handleSwitchAccount = async () => {
    try {
      setIsSwitching(true);
      setConnectionError("");
      await switchWalletAccount();
    } catch (err: any) {
      console.error("Failed to switch account:", err);
      if (!err.message?.includes("rejected")) {
        setConnectionError(err.message || "Failed to switch account");
        error("Failed to switch account", { description: err.message || "Please try again." });
      } else {
        userRejected("Account switch cancelled");
      }
    } finally {
      setIsSwitching(false);
    }
  };

  // ── Not connected: wallet selector ──
  if (!isConnected) {
    return (
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogTrigger asChild>
          <Button variant="gradient" disabled={isLoading}>
            <User className="w-4 h-4 mr-2" />
            Connect
          </Button>
        </DialogTrigger>
        <DialogContent className="brand-card border-2 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Connect Wallet</DialogTitle>
            <DialogDescription className="text-[var(--text-secondary)]">
              Choose a wallet to connect to Avalanche Fuji
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-1.5">
            {/* Installed wallets */}
            {installedWallets.length > 0 && (
              <>
                {installedWallets.map((w) => (
                  <button
                    key={w.id}
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--border-light)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] hover:border-[var(--primary)]/30 transition-all text-left group"
                  >
                    <w.icon className="w-8 h-8 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)]">{w.name}</div>
                    </div>
                    <span className="text-[10px] font-medium text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                      Installed
                    </span>
                  </button>
                ))}

                {/* Generic browser wallet (if any EIP-1193 provider exists) */}
                {hasAnyWallet && installedWallets.length === 0 && (
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--border-light)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] hover:border-[var(--primary)]/30 transition-all text-left"
                  >
                    <GenericWalletIcon className="w-8 h-8 shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[var(--text-primary)]">Browser Wallet</div>
                    </div>
                    <span className="text-[10px] font-medium text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                      Detected
                    </span>
                  </button>
                )}
              </>
            )}

            {/* Fallback: generic wallet if provider exists but no specific wallet detected */}
            {installedWallets.length === 0 && hasAnyWallet && (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--border-light)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] hover:border-[var(--primary)]/30 transition-all text-left"
              >
                <GenericWalletIcon className="w-8 h-8 shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-[var(--text-primary)]">Browser Wallet</div>
                  <div className="text-[11px] text-[var(--text-tertiary)]">EVM compatible wallet detected</div>
                </div>
                <span className="text-[10px] font-medium text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                  Detected
                </span>
              </button>
            )}

            {/* Separator */}
            {notInstalledWallets.length > 0 && (installedWallets.length > 0 || hasAnyWallet) && (
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-[var(--border-light)]" />
                <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">Or install</span>
                <div className="flex-1 h-px bg-[var(--border-light)]" />
              </div>
            )}

            {/* Not installed wallets */}
            {notInstalledWallets.map((w) => (
              <a
                key={w.id}
                href={w.installUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--border-lighter)] bg-[var(--surface-secondary)] hover:bg-[var(--surface-hover)] transition-all text-left group"
              >
                <w.icon className="w-8 h-8 shrink-0 opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors">{w.name}</div>
                </div>
                <span className="text-[10px] font-medium text-[var(--text-tertiary)] group-hover:text-[var(--primary)] transition-colors flex items-center gap-0.5">
                  Install
                  <ArrowSquareOut className="w-3 h-3" />
                </span>
              </a>
            ))}

            {/* No wallet at all */}
            {!hasAnyWallet && installedWallets.length === 0 && (
              <div className="text-center py-3">
                <p className="text-[12px] text-[var(--text-tertiary)]">
                  No wallet detected. Install one above to get started.
                </p>
              </div>
            )}
          </div>

          {/* Loading state */}
          {isConnecting && (
            <div className="text-center py-2">
              <p className="text-[12px] text-[var(--primary)] font-medium">Connecting...</p>
            </div>
          )}

          {/* Error */}
          {connectionError && (
            <Alert variant="destructive" className="mt-2">
              <WarningCircle className="h-4 w-4" />
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription className="text-[12px]">{connectionError}</AlertDescription>
            </Alert>
          )}

          <p className="text-[10px] text-[var(--text-tertiary)] text-center mt-2">
            By connecting, you agree to the Terms of Service
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Connected: account details ──
  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <div className="flex items-center gap-3">
        <div className="brand-card px-3 py-1.5 flex items-center gap-2">
          <User className="w-4 h-4 text-[var(--primary)]" />
          <AddressDisplay address={address} maxLength={12} />
        </div>

        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <User className="w-4 h-4" />
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent className="brand-card border-2">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Wallet</DialogTitle>
          <DialogDescription className="text-[var(--text-secondary)]">Your connected wallet</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="brand-card p-4 space-y-2">
            <p className="text-sm text-muted-foreground">Address</p>
            <code className="text-sm font-mono break-all">{address}</code>
          </div>

          <div className="brand-card p-4 space-y-2">
            <p className="text-sm text-muted-foreground">Network</p>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isOnCorrectNetwork
                    ? "bg-green-500"
                    : "bg-yellow-500 animate-pulse"
                }`}
              />
              <span className="text-sm">
                {isOnCorrectNetwork ? "Avalanche Fuji" : "Wrong Network"}
              </span>
            </div>
          </div>

          {connectionError && (
            <Alert variant="destructive">
              <WarningCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{connectionError}</AlertDescription>
            </Alert>
          )}

          <div className="mt-6 pt-4 border-t border-[var(--border-light)] space-y-3">
            <Button
              onClick={handleSwitchAccount}
              variant="outline"
              className="w-full"
              disabled={isSwitching || isLoading}
            >
              <User className="w-4 h-4 mr-2" />
              {isSwitching ? "Switching..." : "Switch Account"}
            </Button>

            <Button
              onClick={handleDisconnect}
              className="w-full text-destructive hover:text-destructive"
              variant="outline"
              disabled={isSwitching || isLoading}
            >
              <SignOut className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
