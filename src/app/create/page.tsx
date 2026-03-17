"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Fingerprint } from "lucide-react";
import { createTreasuryAction } from "@/domain/treasury/actions/treasury-actions";

export default function CreateTreasuryPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createTreasuryAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-900">
            <Fingerprint className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold">Create Treasury</h1>
          <p className="mt-1 text-sm text-gray-500">
            Choose a name and create your passkey
          </p>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="treasury-name"
              className="mb-1 block text-sm font-medium"
            >
              Treasury Name
            </label>
            <Input
              id="treasury-name"
              name="name"
              placeholder="My Treasury"
              required
              maxLength={100}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full"
            size="lg"
          >
            <Fingerprint className="h-5 w-5" />
            {isPending ? "Creating..." : "Create with Passkey"}
          </Button>
        </form>
      </div>
    </div>
  );
}
