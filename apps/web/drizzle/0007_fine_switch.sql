CREATE TABLE "bridge_deposits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"source_chain" text NOT NULL,
	"amount" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"source_tx_hash" text NOT NULL,
	"tempo_tx_hash" text,
	"lz_message_hash" text,
	"bridge_fee" text,
	"initiated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "bridge_deposits" ADD CONSTRAINT "bridge_deposits_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bridge_deposits_source_tx_hash_idx" ON "bridge_deposits" USING btree ("source_tx_hash");--> statement-breakpoint
CREATE INDEX "bridge_deposits_account_status_idx" ON "bridge_deposits" USING btree ("account_id","status");