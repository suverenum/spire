import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatBalance(balance: bigint, decimals: number): string {
  const negative = balance < 0n;
  const abs = negative ? -balance : balance;
  const divisor = 10n ** BigInt(decimals);
  const whole = abs / divisor;
  const fractional = abs % divisor;
  const fullFractionalStr = fractional.toString().padStart(decimals, "0");
  const twoDecimal = fullFractionalStr.slice(0, 2);

  // Show full precision for non-zero sub-cent amounts to avoid misleading "$0.00"
  if (abs > 0n && whole === 0n && twoDecimal === "00") {
    const trimmed = fullFractionalStr.replace(/0+$/, "");
    return `${negative ? "-" : ""}0.${trimmed}`;
  }

  return `${negative ? "-" : ""}${whole.toString()}.${twoDecimal}`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
