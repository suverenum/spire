CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"treasury_id" uuid NOT NULL,
	"name" text NOT NULL,
	"token_symbol" text NOT NULL,
	"token_address" text NOT NULL,
	"wallet_address" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_treasury_id_treasuries_id_fk" FOREIGN KEY ("treasury_id") REFERENCES "public"."treasuries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_treasury_name_idx" ON "accounts" USING btree ("treasury_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_wallet_address_idx" ON "accounts" USING btree ("wallet_address");