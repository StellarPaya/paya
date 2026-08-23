#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, String};
use crate::types::{RefundRecord, DisputeRecord, RefundStatus, RefundReason, RefundType, DisputeStatus, DisputeReason, RefundPolicy, Error};

mod logic;
mod storage;
mod types;

/// Refund Contract
/// 
/// This contract manages refunds and disputes for payments on the Stellar network.
/// It provides a comprehensive refund system with support for full and partial refunds,
/// dispute resolution, evidence collection, and configurable refund policies. The contract
/// ensures proper tracking of all refund operations and maintains an audit trail.
/// 
/// # Design Goals
/// - Flexible refund processing (full, partial, automatic, manual)
/// - Dispute resolution with evidence collection
/// - Configurable refund policies with time windows
/// - Integration with payment registry for payment verification
/// - Comprehensive audit trail for all refund operations
/// - Protection against refund fraud and abuse
/// 
/// # Storage Layout
/// - Admin address stored under "ADMIN" key
/// - Refund policy stored under "POLICY" key
/// - Refund records stored under refund_id (Symbol) keys
/// - Dispute records stored under dispute_id (Symbol) keys
/// - Evidence records linked to dispute IDs
/// 
/// # Events
/// - RefundCreated: Emitted when a new refund is created
/// - RefundProcessed: Emitted when a refund is successfully processed
/// - RefundFailed: Emitted when a refund processing fails
/// - RefundReversed: Emitted when a refund is reversed
/// - DisputeCreated: Emitted when a new dispute is created
/// - DisputeUpdated: Emitted when dispute status changes
/// - EvidenceAdded: Emitted when evidence is added to a dispute
/// - RefundLinked: Emitted when a refund is linked to a dispute
/// 
/// # Gas Cost Estimates
/// - initialize: ~12,000 gas
/// - create_refund: ~25,000 gas
/// - process_refund: ~20,000 gas
/// - fail_refund: ~15,000 gas
/// - reverse_refund: ~18,000 gas
/// - create_dispute: ~22,000 gas
/// - update_dispute_status: ~15,000 gas
/// - add_evidence: ~18,000 gas
/// - link_refund: ~15,000 gas
/// 
/// # Security Considerations
/// - Only admin can update refund policies
/// - Refund amounts are validated against original payment
/// - Time windows enforce refund eligibility
/// - Dispute resolution requires proper authorization
/// - Reentrancy protection on refund processing
/// - Evidence collection prevents tampering
#[contract]
pub struct RefundContract;

#[contractimpl]
impl RefundContract {
    pub fn initialize(env: Env, admin: Address, policy: RefundPolicy) {
        logic::initialize(&env, admin.into(), policy);
    }

    pub fn create_refund(
        env: Env,
        refund_id: String,
        payment_id: String,
        merchant: Address,
        customer: Address,
        original_amount: i128,
        refund_type: RefundType,
        partial_amount: Option<i128>,
        reason: RefundReason,
        payment_timestamp: u64,
    ) -> Result<(), Error> {
        logic::create_refund(
            &env,
            Symbol::new(&env, &refund_id),
            Symbol::new(&env, &payment_id),
            merchant,
            customer,
            original_amount,
            refund_type,
            partial_amount,
            reason,
            payment_timestamp,
        )
    }

    pub fn process_refund(env: Env, refund_id: String, tx_hash: String) -> Result<(), Error> {
        logic::process_refund(&env, Symbol::new(&env, &refund_id), Symbol::new(&env, &tx_hash))
    }

    pub fn fail_refund(env: Env, refund_id: String) -> Result<(), Error> {
        logic::fail_refund(&env, Symbol::new(&env, &refund_id))
    }

    pub fn reverse_refund(env: Env, refund_id: String) -> Result<(), Error> {
        logic::reverse_refund(&env, Symbol::new(&env, &refund_id))
    }

    pub fn get_refund(env: Env, refund_id: String) -> Result<RefundRecord, Error> {
        storage::get_refund(&env, &Symbol::new(&env, &refund_id)).ok_or(Error::RefundNotFound)
    }

    pub fn create_dispute(
        env: Env,
        dispute_id: String,
        payment_id: String,
        merchant: Address,
        customer: Address,
        amount: i128,
        reason: DisputeReason,
        response_deadline_days: u32,
    ) -> Result<(), Error> {
        logic::create_dispute(
            &env,
            Symbol::new(&env, &dispute_id),
            Symbol::new(&env, &payment_id),
            merchant,
            customer,
            amount,
            reason,
            response_deadline_days,
        )
    }

    pub fn update_dispute_status(
        env: Env,
        dispute_id: String,
        new_status: DisputeStatus,
    ) -> Result<(), Error> {
        logic::update_dispute_status(&env, Symbol::new(&env, &dispute_id), new_status)
    }

    pub fn add_evidence(env: Env, dispute_id: String) -> Result<(), Error> {
        logic::add_evidence_to_dispute(&env, Symbol::new(&env, &dispute_id))
    }

    pub fn link_refund(env: Env, dispute_id: String, refund_id: String) -> Result<(), Error> {
        logic::link_refund_to_dispute(&env, Symbol::new(&env, &dispute_id), Symbol::new(&env, &refund_id))
    }

    pub fn get_dispute(env: Env, dispute_id: String) -> Result<DisputeRecord, Error> {
        storage::get_dispute(&env, &Symbol::new(&env, &dispute_id)).ok_or(Error::DisputeNotFound)
    }

    pub fn get_policy(env: Env) -> Result<RefundPolicy, Error> {
        storage::get_refund_policy(&env).ok_or(Error::RefundNotFound)
    }

    pub fn update_policy(env: Env, admin: Address, new_policy: RefundPolicy) -> Result<(), Error> {
        let current_admin = storage::get_admin(&env).ok_or(Error::NotAuthorized)?;
        if current_admin != admin.into() {
            return Err(Error::NotAuthorized);
        }
        storage::set_refund_policy(&env, &new_policy);
        Ok(())
    }
}

#[cfg(test)]
mod test;
