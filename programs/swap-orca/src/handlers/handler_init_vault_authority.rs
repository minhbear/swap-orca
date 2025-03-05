use std::str::FromStr;

use anchor_lang::prelude::*;

use crate::{common::constant::OPERATOR_PUBKEY_STR, state::VaultAuthority};

pub fn process<'info>(ctx: Context<'_, '_, '_, 'info, InitVaultAuthority<'info>>) -> Result<()> {
  ctx.accounts.vault_authority.bump = ctx.bumps.vault_authority;

  Ok(())
}

#[derive(Accounts)]
pub struct InitVaultAuthority<'info> {
  #[account(
    mut,
    constraint = operator.key() == Pubkey::from_str(OPERATOR_PUBKEY_STR).unwrap()
  )]
  pub operator: Signer<'info>,

  #[account(
    init,
    payer = operator,
    space = 8 + VaultAuthority::INIT_SPACE,
    seeds = [b"vault_authority"],
    bump
  )]
  pub vault_authority: Account<'info, VaultAuthority>,

  pub system_program: Program<'info, System>,
}