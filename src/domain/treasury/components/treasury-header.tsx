"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { truncateAddress } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Copy, LogOut, Settings } from "lucide-react";
import { logoutAction } from "@/domain/auth/actions/auth-actions";

interface TreasuryHeaderProps {
  name: string;
  address: `0x${string}`;
}

export function TreasuryHeader({ name, address }: TreasuryHeaderProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleCopyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      toast("Address copied!", "success");
    } catch {
      toast("Failed to copy address", "error");
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logoutAction();
    } catch {
      // redirect throws
    }
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <div>
          <h1 className="text-xl font-semibold">{name}</h1>
          <button
            onClick={handleCopyAddress}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            {truncateAddress(address)}
            <Copy className="h-3 w-3" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/settings")}
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-label="Logout"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
