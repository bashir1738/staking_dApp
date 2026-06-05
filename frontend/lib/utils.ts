import { ethers } from "ethers";

export function formatETH(wei: bigint, decimals = 4): string {
  const formatted = ethers.formatEther(wei);
  const num = parseFloat(formatted);
  if (num === 0) return "0";
  if (num < 0.0001) return "< 0.0001";
  return num.toFixed(decimals).replace(/\.?0+$/, "");
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getAPRLabel(amountWei: bigint): string {
  const one = ethers.parseEther("1");
  const five = ethers.parseEther("5");
  if (amountWei >= five) return "12%";
  if (amountWei >= one) return "8%";
  return "5%";
}

export function getAPRBps(amountWei: bigint): number {
  const one = ethers.parseEther("1");
  const five = ethers.parseEther("5");
  if (amountWei >= five) return 1200;
  if (amountWei >= one) return 800;
  return 500;
}

export function formatDuration(startSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - startSeconds;
  if (elapsed < 60) return `${elapsed}s`;
  if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m`;
  if (elapsed < 86400) return `${Math.floor(elapsed / 3600)}h ${Math.floor((elapsed % 3600) / 60)}m`;
  const days = Math.floor(elapsed / 86400);
  const hours = Math.floor((elapsed % 86400) / 3600);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

export function lockTimeRemaining(startSeconds: number): string {
  const lockEnd = startSeconds + 7 * 24 * 3600;
  const now = Math.floor(Date.now() / 1000);
  const remaining = lockEnd - now;
  if (remaining <= 0) return "";
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((remaining % 3600) / 60);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export function parseError(error: unknown): string {
  if (error === null || error === undefined) return "Unknown error";
  if (typeof error !== "object") return String(error);

  const e = error as Record<string, unknown>;

  // User rejected
  if (e.code === "ACTION_REJECTED" || e.code === 4001) {
    return "Transaction rejected by user";
  }

  // Revert with reason
  if (typeof e.reason === "string" && e.reason.length > 0) {
    return e.reason;
  }

  // Revert data
  if (e.code === "CALL_EXCEPTION") {
    if (typeof e.shortMessage === "string") return e.shortMessage;
    return "Transaction reverted";
  }

  // Insufficient funds
  if (typeof e.message === "string" && e.message.toLowerCase().includes("insufficient funds")) {
    return "Insufficient funds";
  }

  // Wrong network
  if (typeof e.message === "string" && e.message.toLowerCase().includes("network")) {
    return "Wrong network — please switch to Sepolia";
  }

  if (typeof e.shortMessage === "string") return e.shortMessage;
  if (typeof e.message === "string") return e.message;

  return "Transaction failed";
}
