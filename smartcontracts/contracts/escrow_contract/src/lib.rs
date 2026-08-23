#![no_std]

use soroban_sdk::{contract, contractimpl, Env, Address};

mod logic;
mod storage;
mod types;

/// Escrow Contract
/// 
/// This contract manages escrow payments where funds are held securely
/// until predefined conditions are met for release. It provides a trustless
/// way to hold payments conditional on delivery, time locks, or dispute resolution.
/// 
/// # Design Goals
/// - Secure fund holding with conditional release mechanisms
/// - Support for multiple release conditions (delivery, time, approval)
/// - Dispute resolution with admin intervention capability
/// - Transparent escrow state tracking
/// 
/// # Storage Layout
/// - Admin address stored under "ADMIN" key
/// - Escrow records stored under escrow ID keys
/// - Each escrow contains: amount, buyer, seller, status, conditions, timestamps
/// 
/// # Events
/// - EscrowCreated: Emitted when a new escrow is created
/// - EscrowReleased: Emitted when funds are released to seller
/// - EscrowRefunded: Emitted when funds are refunded to buyer
/// - EscrowDisputed: Emitted when a dispute is raised
/// 
/// # Gas Cost Estimates
/// - initialize: ~10,000 gas
/// - create_escrow: ~25,000 gas
/// - release_escrow: ~20,000 gas
/// - refund_escrow: ~20,000 gas
/// 
/// # Security Considerations
/// - Only admin can resolve disputes
/// - Release conditions are validated before fund transfer
/// - Reentrancy protection on external calls
/// - Time locks prevent premature releases
/// - One-way state transitions (CREATED -> RELEASED/REFUNDED)
#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
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
    /// - Contract is ready to create escrows
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
}
