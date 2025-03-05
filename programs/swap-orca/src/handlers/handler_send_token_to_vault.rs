use anchor_lang::prelude::*;
use anchor_spl::token_interface::{ self, Mint, TokenAccount, TokenInterface, TransferChecked };

use crate::state::VaultAuthority;

pub fn process<'info>(
    ctx: Context<'_, '_, '_, 'info, SendTokenToVault>,
    amount: u64
) -> Result<()> {
    let decimals = ctx.accounts.token_mint.decimals;

    let cpi_accounts = TransferChecked {
        mint: ctx.accounts.token_mint.to_account_info(),
        from: ctx.accounts.sender_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.sender.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    token_interface::transfer_checked(cpi_context, amount, decimals)?;

    Ok(())
}

#[derive(Accounts)]
pub struct SendTokenToVault<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    #[account(mut)]
    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub sender_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault_authority"],
        bump = vault_authority.bump
    )]
    pub vault_authority: Account<'info, VaultAuthority>,

    #[account(
        mut,
        seeds = [b"vault", token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
        token::token_program = token_program
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}
