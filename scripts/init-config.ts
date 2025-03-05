import { Program } from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";
import * as dotenv from "dotenv";
import { SwapOrca } from "../target/types/swap_orca";
import idl from "../target/idl/swap_orca.json";

const idlObj = JSON.parse(JSON.stringify(idl));

dotenv.config();

if (!process.env.RPC_URL)
  throw new Error("RPC_URL environment variable is required");

const rpcUrl = process.env.RPC_URL;
const connection = new Connection(rpcUrl, "confirmed");
export const program = new Program<SwapOrca>(idlObj, {
  connection,
});
