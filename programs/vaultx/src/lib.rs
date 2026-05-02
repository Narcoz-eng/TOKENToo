use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount};

declare_id!("11111111111111111111111111111111");

const MAX_THEME_LEN: usize = 64;
const MAX_MASCOT_LEN: usize = 64;
const MAX_VIBE_LEN: usize = 128;

#[program]
pub mod vaultx {
    use super::*;

    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        creation_fee_lamports: u64,
        min_creator_token_balance: u64,
        treasury: Pubkey,
    ) -> Result<()> {
        require_keys_neq!(treasury, Pubkey::default(), VaultXError::InvalidTreasury);

        let config = &mut ctx.accounts.global_config;
        config.authority = ctx.accounts.authority.key();
        config.treasury = treasury;
        config.creation_fee_lamports = creation_fee_lamports;
        config.min_creator_token_balance = min_creator_token_balance;
        config.paused = false;
        config.bump = ctx.bumps.global_config;

        emit!(PlatformInitialized {
            authority: config.authority,
            treasury,
        });
        Ok(())
    }

    pub fn create_collection_profile(
        ctx: Context<CreateCollectionProfile>,
        theme: String,
        mascot: String,
        vibe: String,
    ) -> Result<()> {
        let config = &ctx.accounts.global_config;
        require!(!config.paused, VaultXError::PlatformPaused);
        require!(theme.len() <= MAX_THEME_LEN, VaultXError::StringTooLong);
        require!(mascot.len() <= MAX_MASCOT_LEN, VaultXError::StringTooLong);
        require!(vibe.len() <= MAX_VIBE_LEN, VaultXError::StringTooLong);
        require_keys_neq!(ctx.accounts.token_mint.key(), Pubkey::default(), VaultXError::InvalidMint);

        let eligible_by_balance = ctx.accounts.creator_token_account.amount >= config.min_creator_token_balance;
        let eligible_by_fee = ctx.accounts.creator.lamports() >= config.creation_fee_lamports;
        require!(eligible_by_balance || eligible_by_fee, VaultXError::CreatorNotEligible);

        let collection = &mut ctx.accounts.collection_profile;
        collection.token_mint = ctx.accounts.token_mint.key();
        collection.creator = ctx.accounts.creator.key();
        collection.theme = theme;
        collection.mascot = mascot;
        collection.vibe = vibe;
        collection.status = CollectionStatus::Active;
        collection.instant_sell_disabled = false;
        collection.next_position_id = 1;
        collection.created_at = Clock::get()?.unix_timestamp;
        collection.bump = ctx.bumps.collection_profile;

        let fee_vault = &mut ctx.accounts.fee_vault;
        fee_vault.collection = collection.key();
        fee_vault.token_mint = ctx.accounts.token_mint.key();
        fee_vault.raid_rewards_lamports = 0;
        fee_vault.buyback_lamports = 0;
        fee_vault.protocol_lamports = 0;
        fee_vault.creator_lamports = 0;
        fee_vault.safety_lamports = 0;
        fee_vault.bump = ctx.bumps.fee_vault;

        let token_vault = &mut ctx.accounts.token_vault_state;
        token_vault.collection = collection.key();
        token_vault.token_mint = ctx.accounts.token_mint.key();
        token_vault.authority = ctx.accounts.token_vault_authority.key();
        token_vault.bump = ctx.bumps.token_vault_state;

        emit!(CollectionCreated {
            collection: collection.key(),
            token_mint: collection.token_mint,
            creator: collection.creator,
        });
        Ok(())
    }

    pub fn deposit_and_mint_vault_nft(
        ctx: Context<DepositAndMintVaultNft>,
        amount: u64,
        lock_duration: i64,
    ) -> Result<()> {
        let collection = &mut ctx.accounts.collection_profile;
        require!(collection.status == CollectionStatus::Active, VaultXError::CollectionPaused);
        require!(amount > 0, VaultXError::InvalidAmount);
        require!(lock_duration >= 0, VaultXError::InvalidLockDuration);
        require_keys_eq!(ctx.accounts.token_mint.key(), collection.token_mint, VaultXError::InvalidMint);

        let now = Clock::get()?.unix_timestamp;
        let position_id = collection.next_position_id;
        collection.next_position_id = collection
            .next_position_id
            .checked_add(1)
            .ok_or(VaultXError::MathOverflow)?;

        let position = &mut ctx.accounts.vault_position;
        position.collection = collection.key();
        position.owner = ctx.accounts.owner.key();
        position.token_mint = ctx.accounts.token_mint.key();
        position.nft_mint = ctx.accounts.nft_mint.key();
        position.position_id = position_id;
        position.amount = amount;
        position.locked_at = now;
        position.unlock_ts = now.checked_add(lock_duration).ok_or(VaultXError::MathOverflow)?;
        position.redeemed = false;
        position.staked = false;
        position.bump = ctx.bumps.vault_position;

        // TODO: CPI transfer from owner token account into PDA token vault.
        // TODO: CPI mint a standard NFT through Token Metadata/Core and verify collection.

        emit!(VaultDeposited {
            collection: collection.key(),
            owner: ctx.accounts.owner.key(),
            nft_mint: ctx.accounts.nft_mint.key(),
            amount,
            unlock_ts: position.unlock_ts,
        });
        Ok(())
    }

    pub fn redeem_vault_nft(ctx: Context<RedeemVaultNft>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let position = &mut ctx.accounts.vault_position;

        require!(!position.redeemed, VaultXError::AlreadyRedeemed);
        require!(!position.staked, VaultXError::PositionStaked);
        require!(now >= position.unlock_ts, VaultXError::VaultStillLocked);
        require_keys_eq!(position.nft_mint, ctx.accounts.nft_mint.key(), VaultXError::InvalidNft);

        // Mark before releasing custody. V1 has no partial redeem.
        position.redeemed = true;

        // TODO: Validate NFT collection and verified creator.
        // TODO: Burn the Vault NFT or mark it redeemed in metadata.
        // TODO: CPI transfer full token amount from PDA token vault to redeemer.

        emit!(VaultRedeemed {
            collection: position.collection,
            owner: ctx.accounts.owner.key(),
            nft_mint: position.nft_mint,
            amount: position.amount,
        });
        Ok(())
    }

    pub fn stake_vault_nft(ctx: Context<StakeVaultNft>, duration: i64) -> Result<()> {
        require!(duration >= 0, VaultXError::InvalidLockDuration);
        require!(ctx.accounts.collection_profile.status == CollectionStatus::Active, VaultXError::CollectionPaused);
        require_keys_eq!(ctx.accounts.vault_position.nft_mint, ctx.accounts.nft_mint.key(), VaultXError::InvalidNft);
        require!(!ctx.accounts.vault_position.redeemed, VaultXError::AlreadyRedeemed);

        let now = Clock::get()?.unix_timestamp;
        let position = &mut ctx.accounts.vault_position;
        position.staked = true;

        let staking = &mut ctx.accounts.staking_position;
        staking.owner = ctx.accounts.owner.key();
        staking.collection = ctx.accounts.collection_profile.key();
        staking.vault_position = position.key();
        staking.nft_mint = ctx.accounts.nft_mint.key();
        staking.staked_at = now;
        staking.duration = duration;
        staking.rewards_claimed = 0;
        staking.active = true;
        staking.bump = ctx.bumps.staking_position;

        // TODO: Validate holder owns the Vault NFT and freeze/escrow if staking design requires it.

        emit!(VaultStaked {
            collection: staking.collection,
            owner: staking.owner,
            nft_mint: staking.nft_mint,
            duration,
        });
        Ok(())
    }

    pub fn unstake_vault_nft(ctx: Context<UnstakeVaultNft>) -> Result<()> {
        require!(ctx.accounts.staking_position.active, VaultXError::StakeInactive);

        ctx.accounts.staking_position.active = false;
        ctx.accounts.vault_position.staked = false;

        emit!(VaultUnstaked {
            collection: ctx.accounts.staking_position.collection,
            owner: ctx.accounts.owner.key(),
            nft_mint: ctx.accounts.staking_position.nft_mint,
        });
        Ok(())
    }

    pub fn distribute_fees(ctx: Context<DistributeFees>, gross_lamports: u64) -> Result<()> {
        require!(gross_lamports > 0, VaultXError::InvalidAmount);

        let fee_vault = &mut ctx.accounts.fee_vault;
        fee_vault.raid_rewards_lamports = fee_vault
            .raid_rewards_lamports
            .checked_add(gross_lamports * 35 / 100)
            .ok_or(VaultXError::MathOverflow)?;
        fee_vault.buyback_lamports = fee_vault
            .buyback_lamports
            .checked_add(gross_lamports * 35 / 100)
            .ok_or(VaultXError::MathOverflow)?;
        fee_vault.protocol_lamports = fee_vault
            .protocol_lamports
            .checked_add(gross_lamports * 15 / 100)
            .ok_or(VaultXError::MathOverflow)?;
        fee_vault.creator_lamports = fee_vault
            .creator_lamports
            .checked_add(gross_lamports * 10 / 100)
            .ok_or(VaultXError::MathOverflow)?;
        fee_vault.safety_lamports = fee_vault
            .safety_lamports
            .checked_add(gross_lamports * 5 / 100)
            .ok_or(VaultXError::MathOverflow)?;

        emit!(FeesDistributed {
            collection: fee_vault.collection,
            gross_lamports,
        });
        Ok(())
    }

    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        require!(ctx.accounts.staking_position.active, VaultXError::StakeInactive);
        // TODO: Calculate claimable staking and raid rewards, then CPI transfer from fee vault.
        Ok(())
    }

    pub fn pause_collection(ctx: Context<CollectionAdmin>) -> Result<()> {
        require_admin(&ctx.accounts.global_config, &ctx.accounts.authority, &ctx.accounts.collection_profile)?;
        ctx.accounts.collection_profile.status = CollectionStatus::Paused;
        emit!(CollectionPaused {
            collection: ctx.accounts.collection_profile.key(),
        });
        Ok(())
    }

    pub fn emergency_disable_instant_sell(ctx: Context<CollectionAdmin>) -> Result<()> {
        require_admin(&ctx.accounts.global_config, &ctx.accounts.authority, &ctx.accounts.collection_profile)?;
        ctx.accounts.collection_profile.instant_sell_disabled = true;
        ctx.accounts.collection_profile.status = CollectionStatus::RiskDisabled;
        emit!(InstantSellDisabled {
            collection: ctx.accounts.collection_profile.key(),
        });
        Ok(())
    }
}

fn require_admin(config: &Account<GlobalConfig>, signer: &Signer, collection: &Account<CollectionProfile>) -> Result<()> {
    let key = signer.key();
    require!(key == config.authority || key == collection.creator, VaultXError::Unauthorized);
    Ok(())
}

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + GlobalConfig::LEN,
        seeds = [b"global-config"],
        bump
    )]
    pub global_config: Account<'info, GlobalConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateCollectionProfile<'info> {
    #[account(seeds = [b"global-config"], bump = global_config.bump)]
    pub global_config: Account<'info, GlobalConfig>,
    #[account(
        init,
        payer = creator,
        space = 8 + CollectionProfile::LEN,
        seeds = [b"collection", token_mint.key().as_ref()],
        bump
    )]
    pub collection_profile: Account<'info, CollectionProfile>,
    #[account(
        init,
        payer = creator,
        space = 8 + FeeVault::LEN,
        seeds = [b"fee-vault", collection_profile.key().as_ref()],
        bump
    )]
    pub fee_vault: Account<'info, FeeVault>,
    #[account(
        init,
        payer = creator,
        space = 8 + TokenVault::LEN,
        seeds = [b"token-vault-state", collection_profile.key().as_ref()],
        bump
    )]
    pub token_vault_state: Account<'info, TokenVault>,
    /// CHECK: PDA authority for SPL token custody. Used as token account owner in CPI setup.
    #[account(seeds = [b"token-vault-authority", collection_profile.key().as_ref()], bump)]
    pub token_vault_authority: UncheckedAccount<'info>,
    pub token_mint: InterfaceAccount<'info, Mint>,
    #[account(
        constraint = creator_token_account.mint == token_mint.key() @ VaultXError::InvalidMint,
        constraint = creator_token_account.owner == creator.key() @ VaultXError::CreatorNotEligible
    )]
    pub creator_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositAndMintVaultNft<'info> {
    #[account(seeds = [b"global-config"], bump = global_config.bump)]
    pub global_config: Account<'info, GlobalConfig>,
    #[account(
        mut,
        seeds = [b"collection", token_mint.key().as_ref()],
        bump = collection_profile.bump
    )]
    pub collection_profile: Account<'info, CollectionProfile>,
    #[account(
        init,
        payer = owner,
        space = 8 + VaultPosition::LEN,
        seeds = [b"position", nft_mint.key().as_ref()],
        bump
    )]
    pub vault_position: Account<'info, VaultPosition>,
    pub token_mint: InterfaceAccount<'info, Mint>,
    pub nft_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RedeemVaultNft<'info> {
    #[account(mut, seeds = [b"position", nft_mint.key().as_ref()], bump = vault_position.bump)]
    pub vault_position: Account<'info, VaultPosition>,
    pub nft_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, address = vault_position.owner @ VaultXError::Unauthorized)]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct StakeVaultNft<'info> {
    #[account(mut)]
    pub collection_profile: Account<'info, CollectionProfile>,
    #[account(mut, seeds = [b"position", nft_mint.key().as_ref()], bump = vault_position.bump)]
    pub vault_position: Account<'info, VaultPosition>,
    #[account(
        init,
        payer = owner,
        space = 8 + StakingPosition::LEN,
        seeds = [b"stake", nft_mint.key().as_ref(), owner.key().as_ref()],
        bump
    )]
    pub staking_position: Account<'info, StakingPosition>,
    pub nft_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, address = vault_position.owner @ VaultXError::Unauthorized)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UnstakeVaultNft<'info> {
    #[account(mut, has_one = owner @ VaultXError::Unauthorized)]
    pub staking_position: Account<'info, StakingPosition>,
    #[account(mut, address = staking_position.vault_position)]
    pub vault_position: Account<'info, VaultPosition>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct DistributeFees<'info> {
    #[account(mut)]
    pub fee_vault: Account<'info, FeeVault>,
    #[account(address = collection_profile.creator @ VaultXError::Unauthorized)]
    pub creator: Signer<'info>,
    pub collection_profile: Account<'info, CollectionProfile>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut, has_one = owner @ VaultXError::Unauthorized)]
    pub staking_position: Account<'info, StakingPosition>,
    #[account(mut)]
    pub fee_vault: Account<'info, FeeVault>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct CollectionAdmin<'info> {
    #[account(seeds = [b"global-config"], bump = global_config.bump)]
    pub global_config: Account<'info, GlobalConfig>,
    #[account(mut)]
    pub collection_profile: Account<'info, CollectionProfile>,
    pub authority: Signer<'info>,
}

#[account]
pub struct GlobalConfig {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub creation_fee_lamports: u64,
    pub min_creator_token_balance: u64,
    pub paused: bool,
    pub bump: u8,
}

impl GlobalConfig {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 1 + 1;
}

#[account]
pub struct CollectionProfile {
    pub token_mint: Pubkey,
    pub creator: Pubkey,
    pub theme: String,
    pub mascot: String,
    pub vibe: String,
    pub status: CollectionStatus,
    pub instant_sell_disabled: bool,
    pub next_position_id: u64,
    pub created_at: i64,
    pub bump: u8,
}

impl CollectionProfile {
    pub const LEN: usize = 32 + 32 + (4 + MAX_THEME_LEN) + (4 + MAX_MASCOT_LEN) + (4 + MAX_VIBE_LEN) + 1 + 1 + 8 + 8 + 1;
}

#[account]
pub struct VaultPosition {
    pub collection: Pubkey,
    pub owner: Pubkey,
    pub token_mint: Pubkey,
    pub nft_mint: Pubkey,
    pub position_id: u64,
    pub amount: u64,
    pub locked_at: i64,
    pub unlock_ts: i64,
    pub redeemed: bool,
    pub staked: bool,
    pub bump: u8,
}

impl VaultPosition {
    pub const LEN: usize = 32 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 1 + 1 + 1;
}

#[account]
pub struct FeeVault {
    pub collection: Pubkey,
    pub token_mint: Pubkey,
    pub raid_rewards_lamports: u64,
    pub buyback_lamports: u64,
    pub protocol_lamports: u64,
    pub creator_lamports: u64,
    pub safety_lamports: u64,
    pub bump: u8,
}

impl FeeVault {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1;
}

#[account]
pub struct TokenVault {
    pub collection: Pubkey,
    pub token_mint: Pubkey,
    pub authority: Pubkey,
    pub bump: u8,
}

impl TokenVault {
    pub const LEN: usize = 32 + 32 + 32 + 1;
}

#[account]
pub struct RaidConfig {
    pub collection: Pubkey,
    pub xp_cap_daily: u32,
    pub min_wallet_age_hours: u16,
    pub min_holding_hours: u16,
    pub wash_trade_rewards_disabled: bool,
    pub bump: u8,
}

impl RaidConfig {
    pub const LEN: usize = 32 + 4 + 2 + 2 + 1 + 1;
}

#[account]
pub struct StakingPosition {
    pub owner: Pubkey,
    pub collection: Pubkey,
    pub vault_position: Pubkey,
    pub nft_mint: Pubkey,
    pub staked_at: i64,
    pub duration: i64,
    pub rewards_claimed: u64,
    pub active: bool,
    pub bump: u8,
}

impl StakingPosition {
    pub const LEN: usize = 32 + 32 + 32 + 32 + 8 + 8 + 8 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum CollectionStatus {
    Active,
    Paused,
    RiskDisabled,
}

#[event]
pub struct PlatformInitialized {
    pub authority: Pubkey,
    pub treasury: Pubkey,
}

#[event]
pub struct CollectionCreated {
    pub collection: Pubkey,
    pub token_mint: Pubkey,
    pub creator: Pubkey,
}

#[event]
pub struct VaultDeposited {
    pub collection: Pubkey,
    pub owner: Pubkey,
    pub nft_mint: Pubkey,
    pub amount: u64,
    pub unlock_ts: i64,
}

#[event]
pub struct VaultRedeemed {
    pub collection: Pubkey,
    pub owner: Pubkey,
    pub nft_mint: Pubkey,
    pub amount: u64,
}

#[event]
pub struct VaultStaked {
    pub collection: Pubkey,
    pub owner: Pubkey,
    pub nft_mint: Pubkey,
    pub duration: i64,
}

#[event]
pub struct VaultUnstaked {
    pub collection: Pubkey,
    pub owner: Pubkey,
    pub nft_mint: Pubkey,
}

#[event]
pub struct FeesDistributed {
    pub collection: Pubkey,
    pub gross_lamports: u64,
}

#[event]
pub struct CollectionPaused {
    pub collection: Pubkey,
}

#[event]
pub struct InstantSellDisabled {
    pub collection: Pubkey,
}

#[error_code]
pub enum VaultXError {
    #[msg("The platform is paused")]
    PlatformPaused,
    #[msg("The collection is paused or risk disabled")]
    CollectionPaused,
    #[msg("The creator is not eligible to create this collection")]
    CreatorNotEligible,
    #[msg("Invalid mint address")]
    InvalidMint,
    #[msg("Invalid NFT mint")]
    InvalidNft,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid lock duration")]
    InvalidLockDuration,
    #[msg("Vault is still locked")]
    VaultStillLocked,
    #[msg("Vault position has already been redeemed")]
    AlreadyRedeemed,
    #[msg("Vault position is currently staked")]
    PositionStaked,
    #[msg("Staking position is inactive")]
    StakeInactive,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Input string is too long")]
    StringTooLong,
    #[msg("Invalid treasury")]
    InvalidTreasury,
}

