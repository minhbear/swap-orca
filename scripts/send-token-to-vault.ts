import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { program } from "./init-config";
import { seeds } from "./constant";
import { OPERATOR_PRIVATE_KET } from "../deploy/operator-private-key";
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

const connection = program.provider.connection;

const operatorKeypair = Keypair.fromSecretKey(
  new Uint8Array(bs58.decode(OPERATOR_PRIVATE_KET))
);

(async () => {
  const vaultAuthority = PublicKey.findProgramAddressSync(
    seeds.vaultAuthority(),
    program.programId
  )[0];

  const tokenMint = new PublicKey(
    "EvKekJqNVH5dUk7yVXoK5EEPPf85bE748gyz2hSGZ1CY"
  );
  const tokenDecimals = 6;
  const amount = 1_000 * Math.pow(10, tokenDecimals); // 100 USDC

  const senderTokenAccount = getAssociatedTokenAddressSync(
    tokenMint,
    operatorKeypair.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const vault = PublicKey.findProgramAddressSync(
    seeds.vault(tokenMint),
    program.programId
  )[0];

  const tx = await program.methods
    .sendTokenToVault(new anchor.BN(amount))
    .accountsPartial({
      sender: operatorKeypair.publicKey,
      vaultAuthority,
      senderTokenAccount,
      vault,
      tokenMint,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    })
    .transaction();

  const txHash = await sendAndConfirmTransaction(connection, tx, [
    operatorKeypair,
  ]);
  console.log("Success Init Vault Authority", txHash);
})();
