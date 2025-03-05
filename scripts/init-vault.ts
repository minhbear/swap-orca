import {
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
} from "@solana/web3.js";
import bs58 from "bs58";
import { program } from "./init-config";
import { seeds } from "./constant";
import { OPERATOR_PRIVATE_KET } from "../deploy/operator-private-key";
import {
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const connection = program.provider.connection;

const operatorKeypair = Keypair.fromSecretKey(
  new Uint8Array(bs58.decode(OPERATOR_PRIVATE_KET))
);

const tokensPubkey = [
  {
    tokenMint: new PublicKey("EvKekJqNVH5dUk7yVXoK5EEPPf85bE748gyz2hSGZ1CY"),
    tokenProgram: TOKEN_2022_PROGRAM_ID,
  },
  { tokenMint: NATIVE_MINT, tokenProgram: TOKEN_PROGRAM_ID },
];

(async () => {
  for (const tokenPubkey of tokensPubkey) {
    const vault = PublicKey.findProgramAddressSync(
      seeds.vault(tokenPubkey.tokenMint),
      program.programId
    )[0];
    

    const vaultAuthority = PublicKey.findProgramAddressSync(
      seeds.vaultAuthority(),
      program.programId
    )[0];
    console.log("🚀 ~ vaultAuthority:", vaultAuthority.toBase58())

    const tx = await program.methods
      .initVault()
      .accountsPartial({
        operator: operatorKeypair.publicKey,
        systemProgram: SystemProgram.programId,
        vaultAuthority,
        vault,
        tokenMint: tokenPubkey.tokenMint,
        tokenProgram: tokenPubkey.tokenProgram,
      })
      .transaction();

    const txHash = await sendAndConfirmTransaction(connection, tx, [
      operatorKeypair,
    ]);
    console.log(
      `Init vault for token: ${tokenPubkey.tokenMint.toBase58()} success, txHash: ${txHash}`
    );
    console.log(
      "-----------------------------------------------------------------------"
    );
  }
})();
