CREATE TABLE "multisig_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"guard_address" text NOT NULL,
	"owners" jsonb NOT NULL,
	"tiers_json" jsonb NOT NULL,
	"default_confirmations" integer NOT NULL,
	"allowlist_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "multisig_configs_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
CREATE TABLE "multisig_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"multisig_transaction_id" uuid NOT NULL,
	"signer_address" text NOT NULL,
	"confirmed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "multisig_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"on_chain_tx_id" bigint NOT NULL,
	"to" text NOT NULL,
	"value" text NOT NULL,
	"data" text NOT NULL,
	"required_confirmations" integer NOT NULL,
	"current_confirmations" integer DEFAULT 0 NOT NULL,
	"executed" boolean DEFAULT false NOT NULL,
	"executed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "wallet_type" text DEFAULT 'eoa' NOT NULL;--> statement-breakpoint
ALTER TABLE "multisig_configs" ADD CONSTRAINT "multisig_configs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multisig_confirmations" ADD CONSTRAINT "multisig_confirmations_multisig_transaction_id_multisig_transactions_id_fk" FOREIGN KEY ("multisig_transaction_id") REFERENCES "public"."multisig_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multisig_transactions" ADD CONSTRAINT "multisig_transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "multisig_confirm_unique" ON "multisig_confirmations" USING btree ("multisig_transaction_id","signer_address");--> statement-breakpoint
CREATE UNIQUE INDEX "multisig_tx_account_chain_id" ON "multisig_transactions" USING btree ("account_id","on_chain_tx_id");--> statement-breakpoint
CREATE INDEX "multisig_tx_pending" ON "multisig_transactions" USING btree ("account_id","executed");