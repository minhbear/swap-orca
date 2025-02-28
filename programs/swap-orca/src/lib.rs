use anchor_lang::prelude::*;

declare_id!("EGxFP5RvNZVMADSiLZ4j7WQkKQQgY7xgo6MuenN1ypkQ");

#[program]
pub mod swap_orca {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
