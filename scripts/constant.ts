import { PublicKey } from "@solana/web3.js";

export const seeds = {
  vaultAuthority: () => [Buffer.from("vault_authority")],
  vault: (tokenMint: PublicKey) => [Buffer.from("vault"), tokenMint.toBuffer()],
};
