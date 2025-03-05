use std::str::FromStr;

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{ Mint, TokenAccount, TokenInterface };

use crate::{common::constant::OPERATOR_PUBKEY_STR, state::VaultAuthority};

#[derive(Accounts)]
pub struct InitVault<'info> {
  #[account(
    mut,
    constraint = operator.key() == Pubkey::from_str(OPERATOR_PUBKEY_STR).unwrap()
  )]
  pub operator: Signer<'info>,

  #[account(
    mut,
    seeds = [b"vault_authority"],
    bump = vault_authority.bump
  )]
  pub vault_authority: Account<'info, VaultAuthority>, 

  pub token_mint: Box<InterfaceAccount<'info, Mint>>,

  #[account(
    init,
    payer = operator,
    seeds = [b"vault", token_mint.key().as_ref()],
    bump,
    token::mint = token_mint,
    token::authority = vault_authority,
    token::token_program = token_program
  )]
  pub vault: InterfaceAccount<'info, TokenAccount>,

  pub token_program: Interface<'info, TokenInterface>,

  pub system_program: Program<'info, System>,
}