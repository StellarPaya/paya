#![no_std]

use soroban_sdk::{contract, contractimpl, Env, Address};

mod logic;
mod storage;
mod types;

/// Merchant Vault Contract
/// 
/// This contract manages merchant balances and provides secure storage for
/// payment funds before withdrawal. It acts as a custodial vault where merchants
/// can accumulate funds from payments before withdrawing them to their wallets.
/// 
/// # Design Goals
/// - Secure balance management with admin-only deposit authorization
/// - Transparent balance tracking with audit trail
/// - Efficient balance queries for frontend display
/// 
/// # Storage Layout
/// - Admin address stored under "ADMIN" key
/// - Merchant balances stored under merchant address keys
/// - Each balance record contains: merchant_address, usdc_balance, last_updated
/// 
/// # Events
/// - Deposit: Emitted when funds are deposited to a merchant's vault
/// - Withdrawal: Emitted when funds are withdrawn (future feature)
/// 
/// # Gas Cost Estimates
/// - initialize: ~10,000 gas
/// - deposit: ~18,000 gas (includes auth check + storage write + event)
/// - get_merchant_balance: ~8,000 gas
/// 
/// # Security Considerations
/// - Only admin can deposit funds (oracle pattern)
/// - Balance updates use checked arithmetic to prevent overflow
/// - All state changes are atomic
/// - Admin address is set once during initialization
#[contract]
pub struct MerchantVaultContract;

#[contractimpl]
impl MerchantVaultContract {
    /// Initializes the contract with an admin address
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `admin` - Stellar address of the contract administrator
    /// 
    /// # Pre-conditions
    /// - Admin must not already be set
    /// - Admin address must be a valid Stellar address
    /// 
    /// # Post-conditions
    /// - Admin address is stored in persistent storage
    /// - Contract is ready to accept deposits
    /// 
    /// # Events
    /// None
    /// 
    /// # Errors
    /// - Panics if admin is already set
    /// 
    /// # Gas Cost
    /// ~10,000 gas (storage write)
    /// 
    /// # Access Control
    /// Can only be called once during contract initialization
    pub fn initialize(env: Env, admin: Address) {
        logic::initialize(&env, admin);
    }

    /// Deposits funds to a merchant's vault balance
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `merchant` - Stellar address of the merchant
    /// * `amount` - Amount to deposit (in smallest currency units)
    /// 
    /// # Returns
    /// Result indicating success or error
    /// 
    /// # Pre-conditions
    /// - Caller must be the admin (oracle authorization)
    /// - Amount must be positive
    /// - Merchant address must be valid
    /// 
    /// # Post-conditions
    /// - Merchant balance is increased by amount
    /// - Last updated timestamp is set to current ledger time
    /// - Deposit event is emitted
    /// 
    /// # Events
    /// Emits Deposit event with merchant address and amount
    /// 
    /// # Errors
    /// - NotAuthorized if caller is not admin
    /// - Overflow if balance would exceed i128 max
    /// 
    /// # Gas Cost
    /// ~18,000 gas (auth check + storage read/write + event)
    /// 
    /// # Access Control
    /// Only admin can call this function (oracle pattern)
    pub fn deposit(env: Env, merchant: Address, amount: i128) -> Result<(), crate::types::Error> {
        logic::deposit(&env, merchant, amount)
    }

    /// Retrieves the current balance for a merchant
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `merchant` - Stellar address of the merchant
    /// 
    /// # Returns
    /// Current USDC balance for the merchant (0 if no record exists)
    /// 
    /// # Pre-conditions
    /// - None (read-only operation)
    /// 
    /// # Post-conditions
    /// - None (read-only operation)
    /// 
    /// # Events
    /// None
    /// 
    /// # Errors
    /// - None (returns 0 if merchant has no balance)
    /// 
    /// # Gas Cost
    /// ~8,000 gas (storage read)
    /// 
    /// # Access Control
    /// Public function - anyone can query balances
    pub fn get_merchant_balance(env: Env, merchant: Address) -> i128 {
        storage::get_merchant_record(&env, &merchant)
            .map(|r| r.usdc_balance)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
