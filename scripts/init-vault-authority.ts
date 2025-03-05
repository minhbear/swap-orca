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

const connection = program.provider.connection;

const operatorKeypair = Keypair.fromSecretKey(
  new Uint8Array(bs58.decode(OPERATOR_PRIVATE_KET))
);

(async () => {
  const vaultAuthority = PublicKey.findProgramAddressSync(
    seeds.vaultAuthority(),
    program.programId
  )[0];

  const tx = await program.methods
    .initVaultAuthority()
    .accountsPartial({
      operator: operatorKeypair.publicKey,
      systemProgram: SystemProgram.programId,
      vaultAuthority,
    })
    .transaction();

  const txHash = await sendAndConfirmTransaction(connection, tx, [
    operatorKeypair,
  ]);
  console.log("Success Init Vault Authority", txHash);
})();
