"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { error, userRejected, warning } from "../utils/toast";

// ── Avalanche Fuji Configuration ──

const AVALANCHE_FUJI = {
  chainId: 43113,
  chainIdHex: "0xA869",
  chainName: "Avalanche Fuji Testnet",
  nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
  rpcUrls: ["https://api.avax-test.network/ext/bc/C/rpc"],
  blockExplorerUrls: ["https://testnet.snowtrace.io/"],
};

// localStorage key for tracking user's disconnect intent
const DISCONNECT_FLAG = "wallet_disconnected";

// ── Provider detection (works with MetaMask, Rabby, and any EIP-1193 wallet) ──

interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
}

function getProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  return (window as any).ethereum ?? null;
}

function isWalletInstalled(): boolean {
  return getProvider() !== null;
}

// ── Types ──

export interface WalletState {
  address: string | null;
  chainId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  isMetaMaskInstalled: boolean;
  isOnCorrectNetwork: boolean;
}

interface WalletContextValue extends WalletState {
  connectWallet: () => Promise<string>;
  disconnectWallet: () => void;
  switchWalletAccount: () => Promise<string>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

// ── Helpers ──

async function getAccounts(): Promise<string[]> {
  const provider = getProvider();
  if (!provider) return [];
  try {
    return await provider.request({ method: "eth_accounts" });
  } catch {
    return [];
  }
}

async function getCurrentChainId(): Promise<string | null> {
  const provider = getProvider();
  if (!provider) return null;
  try {
    return await provider.request({ method: "eth_chainId" });
  } catch {
    return null;
  }
}

function isCorrectChain(chainIdHex: string | null): boolean {
  if (!chainIdHex) return false;
  return parseInt(chainIdHex, 16) === AVALANCHE_FUJI.chainId;
}

/**
 * Try to switch to Avalanche Fuji. If the chain isn't added yet (error 4902),
 * add it first. Works with MetaMask, Rabby, and any EIP-3085 wallet.
 * If the user rejects, we don't throw — the app still works (just without on-chain features).
 */
async function ensureCorrectNetwork(): Promise<boolean> {
  const provider = getProvider();
  if (!provider) return false;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: AVALANCHE_FUJI.chainIdHex }],
    });
    return true;
  } catch (err: any) {
    // 4902: chain not added to wallet → add it
    if (err.code === 4902) {
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: AVALANCHE_FUJI.chainIdHex,
              chainName: AVALANCHE_FUJI.chainName,
              nativeCurrency: AVALANCHE_FUJI.nativeCurrency,
              rpcUrls: AVALANCHE_FUJI.rpcUrls,
              blockExplorerUrls: AVALANCHE_FUJI.blockExplorerUrls,
            },
          ],
        });
        return true;
      } catch (addErr: any) {
        if (addErr.code === 4001) {
          // User rejected adding the chain — that's okay
          return false;
        }
        console.error("Failed to add Avalanche Fuji:", addErr);
        warning("Please add Avalanche Fuji to your wallet manually");
        return false;
      }
    }

    // 4001: user rejected the switch — that's okay
    if (err.code === 4001) {
      return false;
    }

    // Other error
    console.error("Failed to switch network:", err);
    warning("Please switch to Avalanche Fuji in your wallet");
    return false;
  }
}

// ── Provider Component ──

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnected: false,
    isLoading: true,
    isMetaMaskInstalled: false,
    isOnCorrectNetwork: false,
  });

  // Init: check existing connection on mount
  useEffect(() => {
    const init = async () => {
      const installed = isWalletInstalled();

      if (!installed) {
        setState((s) => ({ ...s, isLoading: false, isMetaMaskInstalled: false }));
        return;
      }

      // Respect disconnect intent
      if (typeof window !== "undefined" && localStorage.getItem(DISCONNECT_FLAG) === "true") {
        setState((s) => ({ ...s, isLoading: false, isMetaMaskInstalled: true }));
        return;
      }

      try {
        const accounts = await getAccounts();
        const chainId = await getCurrentChainId();

        setState({
          address: accounts[0] || null,
          chainId,
          isConnected: accounts.length > 0,
          isLoading: false,
          isMetaMaskInstalled: true,
          isOnCorrectNetwork: isCorrectChain(chainId),
        });
      } catch {
        setState((s) => ({ ...s, isLoading: false, isMetaMaskInstalled: true }));
      }
    };

    init();
  }, []);

  // Listen for wallet events
  useEffect(() => {
    const provider = getProvider();
    if (!provider) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      const chainId = await getCurrentChainId();

      if (accounts.length > 0 && typeof window !== "undefined") {
        localStorage.removeItem(DISCONNECT_FLAG);
      }

      setState((prev) => ({
        ...prev,
        address: accounts[0] || null,
        chainId,
        isConnected: accounts.length > 0,
        isOnCorrectNetwork: isCorrectChain(chainId),
      }));
    };

    const handleChainChanged = async (chainId: string) => {
      const accounts = await getAccounts();

      setState((prev) => ({
        ...prev,
        chainId,
        address: accounts[0] || null,
        isConnected: accounts.length > 0,
        isOnCorrectNetwork: isCorrectChain(chainId),
      }));
    };

    const handleDisconnect = () => {
      setState((prev) => ({ ...prev, address: null, isConnected: false }));
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);
    provider.on("disconnect", handleDisconnect);

    return () => {
      provider.removeListener("accountsChanged", handleAccountsChanged);
      provider.removeListener("chainChanged", handleChainChanged);
      provider.removeListener("disconnect", handleDisconnect);
    };
  }, []);

  // Connect
  const connectWallet = useCallback(async () => {
    const provider = getProvider();
    if (!provider) throw new Error("No wallet detected");

    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      // Request accounts (works with any EIP-1193 wallet)
      const accounts: string[] = await provider.request({ method: "eth_requestAccounts" });
      if (!accounts.length) throw new Error("No accounts returned");

      // Try to switch to Fuji (non-blocking — app works even on wrong chain)
      const switched = await ensureCorrectNetwork();
      const chainId = await getCurrentChainId();

      if (typeof window !== "undefined") {
        localStorage.removeItem(DISCONNECT_FLAG);
      }

      setState({
        address: accounts[0],
        chainId,
        isConnected: true,
        isLoading: false,
        isMetaMaskInstalled: true,
        isOnCorrectNetwork: isCorrectChain(chainId),
      });

      if (!switched) {
        warning("Connected, but please switch to Avalanche Fuji for full functionality");
      }

      return accounts[0];
    } catch (err: any) {
      setState((prev) => ({ ...prev, isLoading: false }));

      if (err.code === 4001 || err.message?.includes("rejected")) {
        userRejected("Connection cancelled");
      } else {
        error("Failed to connect wallet", {
          description: err.message || "Please check your wallet and try again.",
        });
      }

      throw err;
    }
  }, []);

  // Disconnect
  const disconnectWallet = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(DISCONNECT_FLAG, "true");
    }
    setState((prev) => ({ ...prev, address: null, isConnected: false }));
  }, []);

  // Switch account
  const switchWalletAccount = useCallback(async () => {
    const provider = getProvider();
    if (!provider) throw new Error("No wallet detected");

    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      await provider.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });

      const accounts: string[] = await provider.request({ method: "eth_accounts" });
      if (!accounts.length) throw new Error("No account selected");

      const chainId = await getCurrentChainId();

      if (typeof window !== "undefined") {
        localStorage.removeItem(DISCONNECT_FLAG);
      }

      setState({
        address: accounts[0],
        chainId,
        isConnected: true,
        isLoading: false,
        isMetaMaskInstalled: true,
        isOnCorrectNetwork: isCorrectChain(chainId),
      });

      return accounts[0];
    } catch (err: any) {
      setState((prev) => ({ ...prev, isLoading: false }));

      if (err.code === 4001 || err.message?.includes("rejected")) {
        userRejected("Account switch cancelled");
      } else {
        error("Failed to switch account", {
          description: err.message || "Please try again.",
        });
      }

      throw err;
    }
  }, []);

  const value: WalletContextValue = {
    ...state,
    connectWallet,
    disconnectWallet,
    switchWalletAccount,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
