use std::str::FromStr;

use anchor_lang::prelude::*;
use anchor_spl::memo::Memo;
use anchor_spl::token_interface::{ Mint, TokenAccount, TokenInterface };
use whirlpool_cpi::{ self, state::*, program::Whirlpool as WhirlpoolProgram };

use crate::common::constant::OPERATOR_PUBKEY_STR;
use crate::state::VaultAuthority;

pub fn process<'info>(
    ctx: Context<'_, '_, '_, 'info, ProxySwap<'info>>,
    amount: u64,
    other_amount_threshold: u64,
    sqrt_price_limit: u128,
    amount_specified_is_input: bool,
    a_to_b: bool,
    remaining_accounts_info: Option<RemainingAccountsInfo>
) -> Result<()> {
    let cpi_program = ctx.accounts.whirlpool_program.to_account_info();

    let vault_authority = ctx.accounts.vault_authority.clone();

    let authority_signer_seeds: &[&[&[u8]]] = &[&[b"vault_authority", &[vault_authority.bump]]];

    let cpi_accounts = whirlpool_cpi::cpi::accounts::SwapV2 {
        whirlpool: ctx.accounts.whirlpool.to_account_info(),
        token_program_a: ctx.accounts.token_program_a.to_account_info(),
        token_program_b: ctx.accounts.token_program_b.to_account_info(),
        token_mint_a: ctx.accounts.token_mint_a.to_account_info(),
        token_mint_b: ctx.accounts.token_mint_b.to_account_info(),
        memo_program: ctx.accounts.memo_program.to_account_info(),
        token_authority: ctx.accounts.vault_authority.to_account_info(),
        token_owner_account_a: ctx.accounts.vault_token_account_a.to_account_info(),
        token_vault_a: ctx.accounts.whirlpool_token_vault_a.to_account_info(),
        token_owner_account_b: ctx.accounts.vault_token_account_b.to_account_info(),
        token_vault_b: ctx.accounts.whirlpool_token_vault_b.to_account_info(),
        tick_array_0: ctx.accounts.tick_array_0.to_account_info(),
        tick_array_1: ctx.accounts.tick_array_1.to_account_info(),
        tick_array_2: ctx.accounts.tick_array_2.to_account_info(),
        oracle: ctx.accounts.oracle.to_account_info(),
    };

    let remaining_accounts = ctx.remaining_accounts.to_vec();
    let cpi_ctx = CpiContext::new_with_signer(
        cpi_program,
        cpi_accounts,
        authority_signer_seeds
    ).with_remaining_accounts(remaining_accounts);

    // execute CPI
    msg!("CPI: whirlpool swap instruction");
    whirlpool_cpi::cpi::swap_v2(
        cpi_ctx,
        amount,
        other_amount_threshold,
        sqrt_price_limit,
        amount_specified_is_input,
        a_to_b,
        remaining_accounts_info
    )?;

    Ok(())
}

#[derive(Accounts)]
pub struct ProxySwap<'info> {
    #[account(
        mut,
        constraint = operator.key() == Pubkey::from_str(OPERATOR_PUBKEY_STR).unwrap()
    )]
    pub operator: Signer<'info>,

    pub whirlpool_program: Program<'info, WhirlpoolProgram>,

    pub token_program_a: Interface<'info, TokenInterface>,

    pub token_program_b: Interface<'info, TokenInterface>,

    pub token_mint_a: InterfaceAccount<'info, Mint>,

    pub token_mint_b: InterfaceAccount<'info, Mint>,

    pub memo_program: Program<'info, Memo>,

    pub vault_authority: Box<Account<'info, VaultAuthority>>,

    #[account(mut)]
    pub whirlpool: Box<Account<'info, Whirlpool>>,

    #[account(mut, constraint = vault_token_account_a.mint == whirlpool.token_mint_a)]
    pub vault_token_account_a: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut, address = whirlpool.token_vault_a)]
    pub whirlpool_token_vault_a: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut, constraint = vault_token_account_b.mint == whirlpool.token_mint_b)]
    pub vault_token_account_b: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut, address = whirlpool.token_vault_b)]
    pub whirlpool_token_vault_b: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut)]
    /// CHECK: checked by whirlpool_program
    pub tick_array_0: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: checked by whirlpool_program
    pub tick_array_1: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: checked by whirlpool_program
    pub tick_array_2: UncheckedAccount<'info>,

    #[account(mut, seeds = [b"oracle", whirlpool.key().as_ref()], bump, seeds::program = whirlpool_program.key())]
    /// CHECK: checked by whirlpool_program
    pub oracle: UncheckedAccount<'info>,
}
