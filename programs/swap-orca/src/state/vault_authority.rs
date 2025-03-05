use anchor_lang::prelude::*;

#[account]
#[derive(Debug, InitSpace)]
pub struct VaultAuthority {
    pub bump: u8,
}
