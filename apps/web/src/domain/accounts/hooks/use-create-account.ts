"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "@/components/ui/toast";

interface CreateAccountParams {
	treasuryId: string;
	tokenSymbol: string;
	name: string;
}

export type AccountCreationStep =
	| "idle"
	| "validating"
	| "generating"
	| "persisting"
	| "complete"
	| "error";

export const CREATE_ACCOUNT_UNAVAILABLE_ERROR =
	"Additional cash accounts are temporarily unavailable";

export function useCreateAccount() {
	const [step, setStep] = useState<AccountCreationStep>("idle");

	const mutation = useMutation({
		mutationFn: async (_params: CreateAccountParams) => {
			setStep("error");
			throw new Error(CREATE_ACCOUNT_UNAVAILABLE_ERROR);
		},
		onError: (error) => {
			toast(error.message || "Failed to create account", "error");
			setTimeout(() => setStep("idle"), 2000);
		},
	});

	return { ...mutation, step };
}
