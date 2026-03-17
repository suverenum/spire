"use client";

import { QRCodeSVG } from "qrcode.react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { Copy } from "lucide-react";

interface ReceiveSheetProps {
  open: boolean;
  onClose: () => void;
  address: `0x${string}`;
}

export function ReceiveSheet({ open, onClose, address }: ReceiveSheetProps) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(address);
      toast("Address copied!", "success");
    } catch {
      toast("Failed to copy", "error");
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Receive Payment">
      <div className="flex flex-col items-center gap-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <QRCodeSVG value={address} size={200} level="M" />
        </div>
        <div className="w-full">
          <p className="mb-1 text-center text-sm text-gray-500">
            Your wallet address
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <code className="min-w-0 flex-1 truncate text-xs">{address}</code>
            <Button variant="ghost" size="icon" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400">
          Share this address or QR code to receive stablecoin payments on Tempo.
        </p>
      </div>
    </Sheet>
  );
}
