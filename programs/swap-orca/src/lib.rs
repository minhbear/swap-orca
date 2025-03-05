use anchor_lang::prelude::*;

declare_id!("EGxFP5RvNZVMADSiLZ4j7WQkKQQgY7xgo6MuenN1ypkQ");

mod state;

mod handlers;
use handlers::*;

mod common;

use whirlpool_cpi::state::*;

#[program]
pub mod swap_orca {
    use super::*;

    pub fn init_vault_authority<'info>(
        ctx: Context<'_, '_, '_, 'info, InitVaultAuthority<'info>>
    ) -> Result<()> {
        handler_init_vault_authority::process(ctx)
    }

    pub fn init_vault<'info>(_ctx: Context<'_, '_, '_, 'info, InitVault<'info>>) -> Result<()> {
        Ok(())
    }

    pub fn send_token_to_vault<'info>(
        ctx: Context<'_, '_, '_, 'info, SendTokenToVault>,
        amount: u64
    ) -> Result<()> {
        handler_send_token_to_vault::process(ctx, amount)
    }

    pub fn swap<'info>(
        ctx: Context<'_, '_, '_, 'info, ProxySwap<'info>>,
        amount: u64,
        other_amount_threshold: u64,
        sqrt_price_limit: u128,
        amount_specified_is_input: bool,
        a_to_b: bool,
        remaining_accounts_info: Option<RemainingAccountsInfo>
    ) -> Result<()> {
        handler_swap::process(
            ctx,
            amount,
            other_amount_threshold,
            sqrt_price_limit,
            amount_specified_is_input,
            a_to_b,
            remaining_accounts_info
        )
    }
}
