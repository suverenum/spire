CREATE TABLE "agent_wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"label" text NOT NULL,
	"guardian_address" text NOT NULL,
	"agent_key_address" text NOT NULL,
	"encrypted_key" text NOT NULL,
	"spending_cap" bigint NOT NULL,
	"daily_limit" bigint NOT NULL,
	"max_per_tx" bigint NOT NULL,
	"allowed_vendors" jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"deployed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_wallets_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
ALTER TABLE "agent_wallets" ADD CONSTRAINT "agent_wallets_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;