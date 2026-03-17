export interface AccountBalance {
  token: string;
  tokenAddress: `0x${string}`;
  balance: bigint;
  decimals: number;
}

export interface Payment {
  id: string;
  txHash: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  amount: bigint;
  token: string;
  memo?: string;
  status: "pending" | "confirmed" | "failed";
  timestamp: Date;
}
