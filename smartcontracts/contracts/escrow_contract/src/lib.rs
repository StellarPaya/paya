#![no_std]

use soroban_sdk::{contract, contractimpl, Env, Address, String};

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
/// - Atomic operations with rollback capability for cross-contract coordination
/// 
/// # Storage Layout
/// - Admin address stored under "ADMIN" key
/// - Escrow records stored under escrow ID keys
/// - Each escrow contains: amount, buyer, seller, status, conditions, timestamps
/// - Check stored under orchestration ID keys for atomic operations
/// 
/// # Events
/// - EscrowCreated: Emitted when a new escrow is created
/// - EscrowReleased: Emitted when funds are released to seller
/// - EscrowRefunded: Emitted when funds are refunded to buyer
/// - EscrowDisputed: Emitted when a dispute is raised
/// - EscrowCreatedAtomic: Emitted when atomic escrow is created
/// - EscrowReleasedAtomic: Emitted when atomic escrow is released
/// - EscrowRolledBack: Emitted when escrow is rolled back
/// 
/// # Gas Cost Estimates
/// - initialize: ~10,000 gas
/// - create_escrow_atomic: ~30,000 gas
/// - release_escrow_atomic: ~25,000 gas
/// - rollback_escrow: ~20,000 gas
/// 
/// # Security Considerations
/// - Only admin can resolve disputes
/// - Release conditions are validated before fund transfer
/// - Reentrancy protection on external calls
/// - Time locks prevent premature releases
/// - One-way state transitions (CREATED -> RELEASED/REFUNDED)
/// - Orchestration ID validation for atomic operations
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

    /// Create an escrow with orchestration coordination for atomic operations
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `escrow_id` - Unique identifier for the escrow
    /// * `buyer` - Address of the buyer
    /// * `seller` - Address of the seller
    /// * `amount` - Amount to hold in escrow
    /// * `currency` - Currency address for the payment
    /// * `release_condition` - Condition for releasing funds
    /// * `dispute_deadline` - Deadline for raising disputes
    /// * `orchestration_id` - Orchestration ID for atomic coordination
    /// 
    /// # Returns
    /// Result containing the created Escrow or error
    /// 
    /// # Pre-conditions
    /// - Escrow ID must be unique
    /// - Amount must be positive
    /// - Orchestration ID must be valid
    /// 
    /// # Post-conditions
    /// - Escrow is stored with CREATED status
    /// - Orchestration ID is stored for coordination
    /// - State checkpoint is created
    /// - EscrowCreatedAtomic event is emitted
    /// 
    /// # Events
    /// Emits EscrowCreatedAtomic event
    /// 
    /// # Errors
    /// - EscrowNotFound if escrow ID already exists
    /// 
    /// # Gas Cost
    /// ~30,000 gas (validation + checkpoint + storage writes + event)
    /// 
    /// # Access Control
    /// Public function - anyone can create atomic escrows
    pub fn create_escrow_atomic(
        env: Env,
        escrow_id: String,
        buyer: Address,
        seller: Address,
        amount: i128,
        currency: Address,
        release_condition: String,
        dispute_deadline: u64,
        orchestration_id: String,
    ) -> Result<crate::types::Escrow, crate::types::Error> {
        logic::create_escrow_atomic(
            &env,
            escrow_id,
            buyer,
            seller,
            amount,
            currency,
            release_condition,
            dispute_deadline,
            orchestration_id,
        )
    }

    /// Release an escrow with orchestration coordination
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `escrow_id` - Unique identifier of the escrow
    /// * `orchestration_id` - Orchestration ID for atomic coordination
    /// 
    /// # Returns
    /// Result containing the updated Escrow or error
    /// 
    /// # Pre-conditions
    /// - Escrow must exist and be in FUNDED status
    /// - Orchestration ID must match
    /// 
    /// # Post-conditions
    /// - Escrow status changes to RELEASED
    /// - State checkpoint is created
    /// - EscrowReleasedAtomic event is emitted
    /// 
    /// # Events
    /// Emits EscrowReleasedAtomic event
    /// 
    /// # Errors
    /// - EscrowNotFound if escrow doesn't exist
    /// - InvalidEscrowState if not in FUNDED status
    /// - OrchestrationMismatch if orchestration ID doesn't match
    /// 
    /// # Gas Cost
    /// ~25,000 gas (validation + checkpoint + state updates + event)
    /// 
    /// # Access Control
    /// Public function - anyone can release atomic escrows
    pub fn release_escrow_atomic(
        env: Env,
        escrow_id: String,
        orchestration_id: String,
    ) -> Result<crate::types::Escrow, crate::types::Error> {
        logic::release_escrow_atomic(&env, escrow_id, orchestration_id)
    }

    /// Rollback an escrow operation (compensating transaction)
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `escrow_id` - Unique identifier of the escrow
    /// * `orchestration_id` - Orchestration ID for coordination
    /// 
    /// # Returns
    /// Result containing the updated Escrow or error
    /// 
    /// # Pre-conditions
    /// - Escrow must exist
    /// - Orchestration ID must match
    /// 
    /// # Post-conditions
    /// - Escrow status is restored from checkpoint
    /// - Checkpoint is cleared
    /// - EscrowRolledBack event is emitted
    /// 
    /// # Events
    /// Emits EscrowRolledBack event
    /// 
    /// # Errors
    /// - EscrowNotFound if escrow doesn't exist
    /// - OrchestrationMismatch if orchestration ID doesn't match
    /// 
    /// # Gas Cost
    /// ~20,000 gas (checkpoint restore + state updates + event)
    /// 
    /// # Access Control
    /// Public function - anyone can rollback escrows
    pub fn rollback_escrow(
        env: Env,
        escrow_id: String,
        orchestration_id: String,
    ) -> Result<crate::types::Escrow, crate::types::Error> {
        logic::rollback_escrow(&env, escrow_id, orchestration_id)
    }

    /// Get state checkpoint for an escrow
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `orchestration_id` - Orchestration ID to get checkpoint for
    /// 
    /// # Returns
    /// Escrow checkpoint or error
    /// 
    /// # Pre-conditions
    /// - Checkpoint must exist
    /// 
    /// # Post-conditions
    /// - None (read-only operation)
    /// 
    /// # Events
    /// None
    /// 
    /// # Errors
    /// - CheckpointNotFound if checkpoint doesn't exist
    /// 
    /// # Gas Cost
    /// ~5,000 gas (storage read)
    /// 
    /// # Access Control
    /// Public function - anyone can query checkpoints
    pub fn get_state_checkpoint(env: Env, orchestration_id: String) -> Result<crate::types::EscrowCheckpoint, crate::types::Error> {
        logic::get_state_checkpoint(&env, orchestration_id)
    }
}
