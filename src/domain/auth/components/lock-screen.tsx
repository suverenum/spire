"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Fingerprint } from "lucide-react";
import { loginAction } from "../actions/auth-actions";

interface LockScreenProps {
  treasuryId: string;
  treasuryName: string;
}

export function LockScreen({ treasuryId, treasuryName }: LockScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleUnlock() {
    setError(null);
    startTransition(async () => {
      const result = await loginAction(treasuryId);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-900">
            <Fingerprint className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-semibold">{treasuryName}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Authenticate with your passkey to continue
          </p>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <Button
          onClick={handleUnlock}
          disabled={isPending}
          size="lg"
          className="w-full"
        >
          <Fingerprint className="h-5 w-5" />
          {isPending ? "Authenticating..." : "Unlock with Passkey"}
        </Button>
      </div>
    </div>
  );
}
