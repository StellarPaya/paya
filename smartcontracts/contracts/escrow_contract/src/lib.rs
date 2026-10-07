#![no_std]

use soroban_sdk::{contract, contractimpl, Env, Address, String};

mod logic;
mod storage;
pub mod types;

#[cfg(test)]
mod test;

/// Escrow Contract
#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// Initializes the contract with an admin address
    pub fn initialize(env: Env, admin: Address) {
        logic::initialize(&env, admin);
    }

    /// Creates a standard escrow
    pub fn create_escrow(
        env: Env,
        escrow_id: String,
        buyer: Address,
        seller: Address,
        amount: i128,
        currency: Address,
        release_condition: String,
        dispute_deadline: u64,
    ) -> Result<crate::types::Escrow, crate::types::Error> {
        logic::create_escrow(
            &env,
            escrow_id,
            buyer,
            seller,
            amount,
            currency,
            release_condition,
            dispute_deadline,
        )
    }

    /// Releases funds to the seller (buyer only)
    pub fn release_escrow(
        env: Env,
        escrow_id: String,
        caller: Address,
    ) -> Result<crate::types::Escrow, crate::types::Error> {
        logic::release_escrow(&env, escrow_id, caller)
    }

    /// Cancels escrow before expiry (buyer only)
    pub fn cancel_escrow(
        env: Env,
        escrow_id: String,
        caller: Address,
    ) -> Result<crate::types::Escrow, crate::types::Error> {
        logic::cancel_escrow(&env, escrow_id, caller)
    }

    /// Raises a dispute before dispute deadline (buyer or seller)
    pub fn dispute_escrow(
        env: Env,
        escrow_id: String,
        caller: Address,
    ) -> Result<crate::types::Escrow, crate::types::Error> {
        logic::dispute_escrow(&env, escrow_id, caller)
    }

    /// Retrieves an escrow record
    pub fn get_escrow(
        env: Env,
        escrow_id: String,
    ) -> Result<crate::types::Escrow, crate::types::Error> {
        logic::get_escrow(&env, escrow_id)
    }

    /// Create an escrow with orchestration coordination for atomic operations
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
    pub fn release_escrow_atomic(
        env: Env,
        escrow_id: String,
        orchestration_id: String,
    ) -> Result<crate::types::Escrow, crate::types::Error> {
        logic::release_escrow_atomic(&env, escrow_id, orchestration_id)
    }

    /// Rollback an escrow operation (compensating transaction)
    pub fn rollback_escrow(
        env: Env,
        escrow_id: String,
        orchestration_id: String,
    ) -> Result<crate::types::Escrow, crate::types::Error> {
        logic::rollback_escrow(&env, escrow_id, orchestration_id)
    }

    /// Get state checkpoint for an escrow
    pub fn get_state_checkpoint(
        env: Env,
        orchestration_id: String,
    ) -> Result<crate::types::EscrowCheckpoint, crate::types::Error> {
        logic::get_state_checkpoint(&env, orchestration_id)
    }
}
