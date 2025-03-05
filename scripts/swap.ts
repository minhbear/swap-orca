import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { program } from "./init-config";
import { OPERATOR_PRIVATE_KET } from "../deploy/operator-private-key";
import {
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  buildWhirlpoolClient,
  MEMO_PROGRAM_ADDRESS,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  // ORCA_WHIRLPOOLS_CONFIG,
  PDAUtil,
  SwapUtils,
  TICK_ARRAY_SIZE,
  TickArray,
  TokenExtensionUtil,
  UseFallbackTickArray,
  Whirlpool,
  WhirlpoolContext,
} from "@orca-so/whirlpools-sdk";

import { AnchorProvider, Wallet as AnchorWallet } from "@coral-xyz/anchor";
import { seeds } from "./constant";
import {
  RemainingAccountsBuilder,
  RemainingAccountsType,
  toSupplementalTickArrayAccountMetas,
} from "./utils/orca/remaining-accounts-util";

const connection = program.provider.connection;

const operatorKeypair = Keypair.fromSecretKey(
  new Uint8Array(bs58.decode(OPERATOR_PRIVATE_KET))
);

function getFallbackTickArray(
  useFallbackTickArray: UseFallbackTickArray,
  tickArrays: TickArray[],
  aToB: boolean,
  whirlpool: Whirlpool,
  programId: PublicKey
): PublicKey | undefined {
  if (useFallbackTickArray === UseFallbackTickArray.Never) {
    return undefined;
  }

  const fallbackTickArray = SwapUtils.getFallbackTickArrayPublicKey(
    tickArrays,
    whirlpool.getData().tickSpacing,
    aToB,
    programId,
    whirlpool.getAddress()
  );

  if (
    useFallbackTickArray === UseFallbackTickArray.Always ||
    !fallbackTickArray
  ) {
    return fallbackTickArray;
  }

  if (useFallbackTickArray === UseFallbackTickArray.Situational) {
    throw new Error(
      `Unexpected UseFallbackTickArray value: ${useFallbackTickArray}`
    );
  }

  const ticksInArray = whirlpool.getData().tickSpacing * TICK_ARRAY_SIZE;
  const tickCurrentIndex = whirlpool.getData().tickCurrentIndex;
  if (aToB) {
    // A to B (direction is right to left): [    ta2     ][    ta1     ][    ta0  ===]
    // if tickCurrentIndex is within the rightmost quarter of ta0, use fallbackTickArray
    const threshold = tickArrays[0].startTickIndex + (ticksInArray / 4) * 3;
    return tickCurrentIndex >= threshold ? fallbackTickArray : undefined;
  } else {
    // B to A (direction is left to right): [=== ta0     ][    ta1     ][    ta2     ]
    // if tickCurrentIndex is within the leftmost quarter of ta0, use fallbackTickArray
    const threshold = tickArrays[0].startTickIndex + ticksInArray / 4;
    return tickCurrentIndex <= threshold ? fallbackTickArray : undefined;
  }
}

// poolId = "FuRgkQqH9GV1ezpmzBxt7SJ5ZppiMFQ1GQ7nX9uiFZtm";
const tokensPubkey = [
  { tokenMint: NATIVE_MINT, tokenProgram: TOKEN_PROGRAM_ID },
  {
    tokenMint: new PublicKey("EvKekJqNVH5dUk7yVXoK5EEPPf85bE748gyz2hSGZ1CY"),
    tokenProgram: TOKEN_2022_PROGRAM_ID,
  },
];

// This is for devnet
const ORCA_WHIRLPOOLS_CONFIG = new PublicKey(
  "FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR"
);

(async () => {
  // Setup whirlpool sdk and get whirlpool config
  const whirlpoolCtx = WhirlpoolContext.withProvider(
    new AnchorProvider(connection, new AnchorWallet(operatorKeypair)),
    ORCA_WHIRLPOOL_PROGRAM_ID
  );
  const fetcher = whirlpoolCtx.fetcher;
  const whirlPoolClient = buildWhirlpoolClient(whirlpoolCtx);

  const tokenAPubkey = tokensPubkey[0].tokenMint;
  const tokenAProgram = tokensPubkey[0].tokenProgram;
  const tokenBPubkey = tokensPubkey[1].tokenMint;
  const tokenBProgram = tokensPubkey[1].tokenProgram;

  const poolWhirlPoolPubkey = PDAUtil.getWhirlpool(
    ORCA_WHIRLPOOL_PROGRAM_ID,
    ORCA_WHIRLPOOLS_CONFIG,
    tokenAPubkey,
    tokenBPubkey,
    64
  ).publicKey;
  const whirlPool = await whirlPoolClient.getPool(poolWhirlPoolPubkey);
  const whirlPoolData = whirlPool.getData();

  const otherAmountThreshold = new anchor.BN(0);
  const aToB = false;
  const sqrtPriceLimit = SwapUtils.getDefaultSqrtPriceLimit(aToB);
  const tickArrays = await SwapUtils.getTickArrays(
    whirlPoolData.tickCurrentIndex,
    whirlPoolData.tickSpacing,
    aToB,
    ORCA_WHIRLPOOL_PROGRAM_ID,
    poolWhirlPoolPubkey,
    fetcher
  );
  const fallbackTickArray: PublicKey | undefined = getFallbackTickArray(
    UseFallbackTickArray.Always,
    tickArrays,
    aToB,
    whirlPool,
    ORCA_WHIRLPOOL_PROGRAM_ID
  );

  const tokenExtensionCtx =
    await TokenExtensionUtil.buildTokenExtensionContextForPool(
      fetcher,
      tokenAPubkey,
      tokenBPubkey
    );
  const oracle = PDAUtil.getOracle(
    ORCA_WHIRLPOOL_PROGRAM_ID,
    whirlPool.getAddress()
  );
  //End get whirlpool config

  const vaultAuthority = PublicKey.findProgramAddressSync(
    seeds.vaultAuthority(),
    program.programId
  )[0];
  const vaultTokenAccountA = PublicKey.findProgramAddressSync(
    seeds.vault(tokenAPubkey),
    program.programId
  )[0];
  const vaultTokenAccountB = PublicKey.findProgramAddressSync(
    seeds.vault(tokenBPubkey),
    program.programId
  )[0];

  const { tokenTransferHookAccountsA, tokenTransferHookAccountsB } =
    await TokenExtensionUtil.getExtraAccountMetasForTransferHookForPool(
      connection,
      tokenExtensionCtx,
      aToB ? vaultTokenAccountA : whirlPoolData.tokenVaultA,
      aToB ? whirlPoolData.tokenVaultA : vaultTokenAccountA,
      aToB ? vaultAuthority : poolWhirlPoolPubkey,
      aToB ? whirlPoolData.tokenVaultB : vaultTokenAccountB,
      aToB ? vaultTokenAccountB : whirlPoolData.tokenVaultB,
      aToB ? poolWhirlPoolPubkey : vaultAuthority
    );

  const [remainingAccountsInfo, remainingAccounts] =
    new RemainingAccountsBuilder()
      .addSlice(RemainingAccountsType.TransferHookA, tokenTransferHookAccountsA)
      .addSlice(RemainingAccountsType.TransferHookB, tokenTransferHookAccountsB)
      .addSlice(
        RemainingAccountsType.SupplementalTickArrays,
        toSupplementalTickArrayAccountMetas([fallbackTickArray])
      )
      .build();

  const amount = 100 * 10 ** 6; // 100 token a

  const tx = await program.methods
    .swap(
      new anchor.BN(amount),
      otherAmountThreshold,
      sqrtPriceLimit,
      true,
      aToB,
      remainingAccountsInfo
    )
    .accountsPartial({
      memoProgram: MEMO_PROGRAM_ADDRESS,
      operator: operatorKeypair.publicKey,
      oracle: oracle.publicKey,
      tickArray0: tickArrays[0].address,
      tickArray1: tickArrays[1].address,
      tickArray2: tickArrays[2].address,
      tokenMintA: tokenAPubkey,
      tokenMintB: tokenBPubkey,
      tokenProgramA: tokenAProgram,
      tokenProgramB: tokenBProgram,
      vaultAuthority,
      vaultTokenAccountA,
      vaultTokenAccountB,
      whirlpool: whirlPool.getAddress(),
      whirlpoolProgram: ORCA_WHIRLPOOL_PROGRAM_ID,
      whirlpoolTokenVaultA: whirlPool.getTokenVaultAInfo().address,
      whirlpoolTokenVaultB: whirlPool.getTokenVaultBInfo().address,
    })
    .remainingAccounts(remainingAccounts)
    .transaction();

  const txHash = await sendAndConfirmTransaction(connection, tx, [
    operatorKeypair,
  ]);
  console.log("🚀 ~ txHash:", txHash);
})();
