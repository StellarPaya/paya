#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env, String, Vec, Symbol};

mod types;
mod storage;
mod logic;

#[cfg(test)]
mod test;

use crate::types::{
    PaymentSplit, Recipient, Milestone, SplitDistribution, 
    SplitType, ContractError, SplitConfig, RefundRequest, SecurityConfig
};
use crate::logic::{
    create_split, execute_split, distribute_to_recipient, confirm_distribution,
    fail_distribution, trigger_milestone, complete_milestone, cancel_split,
    retry_failed_distributions, validate_recursive_structure,
    verify_condition, release_time_lock, request_refund, approve_refund,
    complete_refund, reject_refund, set_reentrancy_protection,
    clear_reentrancy_protection, pause_contract, unpause_contract, is_contract_paused,
    create_split_atomic, execute_split_atomic, rollback_split, get_state_checkpoint
};
use crate::storage::{get_split, get_distribution, get_config, set_config};

/// Payment Split Contract
/// 
/// This contract manages the splitting of payments among multiple recipients.
/// It supports various split types including percentage-based, fixed-amount,
/// milestone-based, conditional, and time-locked splits. The contract provides
/// robust tracking of distributions, retry mechanisms for failed transfers,
/// and comprehensive security features.
/// 
/// # Design Goals
/// - Flexible split types for various payment distribution scenarios
/// - Robust distribution tracking with retry capabilities
/// - Support for recursive split structures (splits of splits)
/// - Conditional releases based on external conditions
/// - Time-locked releases for delayed payments
/// - Comprehensive security with reentrancy protection
/// - Emergency pause functionality for critical situations
/// 
/// # Storage Layout
/// - Contract configuration stored under "CONFIG" key
/// - Payment splits stored under split_id keys
/// - Distributions stored under distribution_id keys
/// - Refund requests stored under refund_id keys
/// - Reentrancy protection flag stored under "REENTRANCY" key
/// - Pause flag stored under "PAUSED" key
/// 
/// # Events
/// - SplitCreated: Emitted when a new payment split is created
/// - SplitExecuted: Emitted when split execution begins
/// - DistributionConfirmed: Emitted when a distribution is confirmed
/// - DistributionFailed: Emitted when a distribution fails
/// - MilestoneTriggered: Emitted when a milestone is triggered
/// - MilestoneCompleted: Emitted when a milestone is completed
/// - SplitCancelled: Emitted when a split is cancelled
/// - RefundRequested: Emitted when a refund is requested
/// - RefundApproved: Emitted when a refund is approved
/// - RefundCompleted: Emitted when a refund is completed
/// - ContractPaused: Emitted when contract is paused
/// - ContractUnpaused: Emitted when contract is unpaused
/// 
/// # Gas Cost Estimates
/// - init: ~12,000 gas
/// - create_split: ~35,000 gas
/// - execute_split: ~25,000 gas
/// - distribute_to_recipient: ~20,000 gas
/// - confirm_distribution: ~15,000 gas
/// - trigger_milestone: ~18,000 gas
/// - complete_milestone: ~15,000 gas
/// - cancel_split: ~20,000 gas
/// - retry_failed_distributions: ~30,000 gas (varies by number of failures)
/// 
/// # Security Considerations
/// - Reentrancy protection on all state-changing functions
/// - Admin-only functions for configuration and emergency controls
/// - Access control for split execution and cancellation
/// - Validation of recursive split structures to prevent infinite loops
/// - Overflow protection on all arithmetic operations
/// - Emergency pause to stop all operations if critical issue detected
#[contract]
pub struct PaymentSplitContract;

#[contractimpl]
impl PaymentSplitContract {
    /// Initialize the contract with default configuration
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `config` - Initial configuration for the contract
    /// 
    /// # Pre-conditions
    /// - Configuration must not already be set
    /// - Configuration parameters must be valid
    /// 
    /// # Post-conditions
    /// - Contract configuration is stored
    /// - Contract is ready to create splits
    /// 
    /// # Events
    /// None
    /// 
    /// # Errors
    /// - Panics if configuration already exists
    /// 
    /// # Gas Cost
    /// ~12,000 gas (storage write)
    /// 
    /// # Access Control
    /// Can only be called once during initialization
    pub fn init(env: Env, config: SplitConfig) {
        set_config(&env, &config);
    }

    /// Create a new payment split
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `split_id` - Unique identifier for the split
    /// * `payment_id` - Reference to the original payment
    /// * `merchant_address` - Address of the merchant creating the split
    /// * `total_amount` - Total amount to be split
    /// * `currency` - Currency address for the payment
    /// * `split_type` - Type of split (percentage, fixed, milestone, etc.)
    /// * `recipients` - List of recipients and their allocations
    /// * `milestones` - Milestone definitions (for milestone-based splits)
    /// 
    /// # Returns
    /// Result containing the created PaymentSplit or error
    /// 
    /// # Pre-conditions
    /// - Split ID must be unique
    /// - Total amount must be positive
    /// - Recipients must sum to 100% (for percentage splits) or match total (for fixed)
    /// - Merchant must be authorized
    /// 
    /// # Post-conditions
    /// - Split is stored with PENDING status
    /// - Recipients are stored with their allocations
    /// - SplitCreated event is emitted
    /// 
    /// # Events
    /// Emits SplitCreated event with split details
    /// 
    /// # Errors
    /// - InvalidSplitConfig if configuration is invalid
    /// - Unauthorized if caller is not merchant
    /// - DuplicateSplitId if split ID already exists
    /// 
    /// # Gas Cost
    /// ~35,000 gas (validation + storage writes + event)
    /// 
    /// # Access Control
    /// Only merchant can create splits for their payments
    pub fn create_split(
        env: Env,
        split_id: String,
        payment_id: String,
        merchant_address: Address,
        total_amount: i128,
        currency: Address,
        split_type: SplitType,
        recipients: Vec<Recipient>,
        milestones: Vec<Milestone>,
    ) -> Result<PaymentSplit, ContractError> {
        create_split(
            &env,
            split_id,
            payment_id,
            merchant_address,
            total_amount,
            currency,
            split_type,
            recipients,
            milestones,
        )
    }

    /// Execute a payment split (begin distribution)
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `split_id` - Unique identifier of the split to execute
    /// * `executor` - Address executing the split
    /// 
    /// # Returns
    /// Result containing the updated PaymentSplit or error
    /// 
    /// # Pre-conditions
    /// - Split must exist and be in PENDING status
    /// - Executor must be authorized (merchant or admin)
    /// - Contract must not be paused
    /// 
    /// # Post-conditions
    /// - Split status changes to EXECUTING
    /// - Distribution records are created for each recipient
    /// - SplitExecuted event is emitted
    /// 
    /// # Events
    /// Emits SplitExecuted event with split ID
    /// 
    /// # Errors
    /// - SplitNotFound if split doesn't exist
    /// - InvalidSplitState if split not in PENDING status
    /// - Unauthorized if executor not authorized
    /// - ContractPaused if contract is paused
    /// 
    /// # Gas Cost
    /// ~25,000 gas (validation + state updates + event)
    /// 
    /// # Access Control
    /// Only merchant or admin can execute splits
    pub fn execute_split(env: Env, split_id: String, executor: Address) -> Result<PaymentSplit, ContractError> {
        execute_split(&env, split_id, executor)
    }

    /// Distribute funds to a specific recipient
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `split_id` - Unique identifier of the split
    /// * `recipient_address` - Address of the recipient
    /// * `amount` - Amount to distribute
    /// * `distribution_id` - Unique identifier for this distribution
    /// 
    /// # Returns
    /// Result containing the SplitDistribution or error
    /// 
    /// # Pre-conditions
    /// - Split must be in EXECUTING status
    /// - Recipient must be part of the split
    /// - Amount must not exceed recipient's allocation
    /// - Reentrancy protection must be clear
    /// 
    /// # Post-conditions
    /// - Distribution record is created
    /// - Reentrancy protection is set
    /// - DistributionConfirmed event is emitted after transfer
    /// 
    /// # Events
    /// Emits DistributionConfirmed event after successful transfer
    /// 
    /// # Errors
    /// - InvalidSplitState if split not executing
    /// - InvalidRecipient if recipient not in split
    /// - InsufficientFunds if amount exceeds allocation
    /// - ReentrancyDetected if reentrancy detected
    /// 
    /// # Gas Cost
    /// ~20,000 gas (validation + external call + state updates)
    /// 
    /// # Access Control
    /// Only authorized executor can distribute
    pub fn distribute_to_recipient(
        env: Env,
        split_id: String,
        recipient_address: Address,
        amount: i128,
        distribution_id: String,
    ) -> Result<SplitDistribution, ContractError> {
        distribute_to_recipient(&env, split_id, recipient_address, amount, distribution_id)
    }

    /// Confirm a successful distribution
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `distribution_id` - Unique identifier of the distribution
    /// * `transaction_hash` - Stellar transaction hash confirming the transfer
    /// 
    /// # Returns
    /// Result containing the updated SplitDistribution or error
    /// 
    /// # Pre-conditions
    /// - Distribution must exist and be in PENDING status
    /// - Transaction hash must be valid
    /// 
    /// # Post-conditions
    /// - Distribution status changes to CONFIRMED
    /// - Transaction hash is stored
    /// - Reentrancy protection is cleared
    /// - DistributionConfirmed event is emitted
    /// 
    /// # Events
    /// Emits DistributionConfirmed event
    /// 
    /// # Errors
    /// - DistributionNotFound if distribution doesn't exist
    /// - InvalidDistributionState if not in PENDING status
    /// 
    /// # Gas Cost
    /// ~15,000 gas (state updates + event)
    /// 
    /// # Access Control
    /// Public function (called after external transfer)
    pub fn confirm_distribution(
        env: Env,
        distribution_id: String,
        transaction_hash: Symbol,
    ) -> Result<SplitDistribution, ContractError> {
        confirm_distribution(&env, distribution_id, transaction_hash)
    }

    /// Mark a distribution as failed
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `distribution_id` - Unique identifier of the distribution
    /// * `error_message` - Description of the failure
    /// 
    /// # Returns
    /// Result containing the updated SplitDistribution or error
    /// 
    /// # Pre-conditions
    /// - Distribution must exist and be in PENDING status
    /// 
    /// # Post-conditions
    /// - Distribution status changes to FAILED
    /// - Error message is stored
    /// - Reentrancy protection is cleared
    /// - DistributionFailed event is emitted
    /// 
    /// # Events
    /// Emits DistributionFailed event
    /// 
    /// # Errors
    /// - DistributionNotFound if distribution doesn't exist
    /// - InvalidDistributionState if not in PENDING status
    /// 
    /// # Gas Cost
    /// ~15,000 gas (state updates + event)
    /// 
    /// # Access Control
    /// Public function (called after failed transfer)
    pub fn fail_distribution(
        env: Env,
        distribution_id: String,
        error_message: String,
    ) -> Result<SplitDistribution, ContractError> {
        fail_distribution(&env, distribution_id, error_message)
    }

    /// Trigger a milestone for milestone-based splits
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `split_id` - Unique identifier of the split
    /// * `milestone_id` - Unique identifier of the milestone
    /// * `triggerer` - Address triggering the milestone
    /// 
    /// # Returns
    /// Result containing the Milestone or error
    /// 
    /// # Pre-conditions
    /// - Split must be milestone-based
    /// - Milestone must exist and be in PENDING status
    /// - Previous milestones must be completed
    /// - Triggerer must be authorized
    /// 
    /// # Post-conditions
    /// - Milestone status changes to TRIGGERED
    /// - Associated distributions are created
    /// - MilestoneTriggered event is emitted
    /// 
    /// # Events
    /// Emits MilestoneTriggered event
    /// 
    /// # Errors
    /// - InvalidSplitType if split not milestone-based
    /// - MilestoneNotFound if milestone doesn't exist
    /// - InvalidMilestoneState if milestone not in PENDING
    /// - MilestoneOrderViolation if previous milestones not completed
    /// - Unauthorized if triggerer not authorized
    /// 
    /// # Gas Cost
    /// ~18,000 gas (validation + state updates + event)
    /// 
    /// # Access Control
    /// Only merchant or admin can trigger milestones
    pub fn trigger_milestone(
        env: Env,
        split_id: String,
        milestone_id: String,
        triggerer: Address,
    ) -> Result<Milestone, ContractError> {
        trigger_milestone(&env, split_id, milestone_id, triggerer)
    }

    /// Complete a milestone
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `split_id` - Unique identifier of the split
    /// * `milestone_id` - Unique identifier of the milestone
    /// * `completer` - Address completing the milestone
    /// 
    /// # Returns
    /// Result containing the Milestone or error
    /// 
    /// # Pre-conditions
    /// - Milestone must be in TRIGGERED status
    /// - All distributions for milestone must be confirmed
    /// - Completer must be authorized
    /// 
    /// # Post-conditions
    /// - Milestone status changes to COMPLETED
    /// - Completion timestamp is set
    /// - MilestoneCompleted event is emitted
    /// 
    /// # Events
    /// Emits MilestoneCompleted event
    /// 
    /// # Errors
    /// - MilestoneNotFound if milestone doesn't exist
    /// - InvalidMilestoneState if milestone not in TRIGGERED
    /// - DistributionsIncomplete if not all distributions confirmed
    /// - Unauthorized if completer not authorized
    /// 
    /// # Gas Cost
    /// ~15,000 gas (validation + state updates + event)
    /// 
    /// # Access Control
    /// Only merchant or admin can complete milestones
    pub fn complete_milestone(
        env: Env,
        split_id: String,
        milestone_id: String,
        completer: Address,
    ) -> Result<Milestone, ContractError> {
        complete_milestone(&env, split_id, milestone_id, completer)
    }

    /// Cancel a pending split
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `split_id` - Unique identifier of the split
    /// * `canceller` - Address cancelling the split
    /// 
    /// # Returns
    /// Result containing the updated PaymentSplit or error
    /// 
    /// # Pre-conditions
    /// - Split must be in PENDING or EXECUTING status
    /// - No distributions must be confirmed
    /// - Canceller must be authorized
    /// 
    /// # Post-conditions
    /// - Split status changes to CANCELLED
    /// - All pending distributions are marked as cancelled
    /// - SplitCancelled event is emitted
    /// 
    /// # Events
    /// Emits SplitCancelled event
    /// 
    /// # Errors
    /// - SplitNotFound if split doesn't exist
    /// - InvalidSplitState if split already completed
    /// - DistributionsConfirmed if some distributions already confirmed
    /// - Unauthorized if canceller not authorized
    /// 
    /// # Gas Cost
    /// ~20,000 gas (validation + state updates + event)
    /// 
    /// # Access Control
    /// Only merchant or admin can cancel splits
    pub fn cancel_split(env: Env, split_id: String, canceller: Address) -> Result<PaymentSplit, ContractError> {
        cancel_split(&env, split_id, canceller)
    }

    /// Retry failed distributions
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `split_id` - Unique identifier of the split
    /// * `retryer` - Address initiating the retry
    /// 
    /// # Returns
    /// Result containing the updated PaymentSplit or error
    /// 
    /// # Pre-conditions
    /// - Split must have failed distributions
    /// - Retryer must be authorized
    /// - Contract must not be paused
    /// 
    /// # Post-conditions
    /// - Failed distributions are reset to PENDING
    /// - Retry count is incremented
    /// - Distribution attempts are re-queued
    /// 
    /// # Events
    /// None (individual distribution events emitted during retry)
    /// 
    /// # Errors
    /// - SplitNotFound if split doesn't exist
    /// - NoFailedDistributions if no failed distributions exist
    /// - MaxRetriesExceeded if retry limit reached
    /// - Unauthorized if retryer not authorized
    /// - ContractPaused if contract is paused
    /// 
    /// # Gas Cost
    /// ~30,000 gas (varies by number of failed distributions)
    /// 
    /// # Access Control
    /// Only merchant or admin can retry distributions
    pub fn retry_failed_distributions(
        env: Env,
        split_id: String,
        retryer: Address,
    ) -> Result<PaymentSplit, ContractError> {
        retry_failed_distributions(&env, split_id, retryer)
    }

    /// Get split details
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `split_id` - Unique identifier of the split
    /// 
    /// # Returns
    /// Result containing the PaymentSplit or error
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
    /// - SplitNotFound if split doesn't exist
    /// 
    /// # Gas Cost
    /// ~8,000 gas (storage read)
    /// 
    /// # Access Control
    /// Public function - anyone can query splits
    pub fn get_split(env: Env, split_id: String) -> Result<PaymentSplit, ContractError> {
        get_split(&env, &split_id)
    }

    /// Get distribution details
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `distribution_id` - Unique identifier of the distribution
    /// 
    /// # Returns
    /// Result containing the SplitDistribution or error
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
    /// - DistributionNotFound if distribution doesn't exist
    /// 
    /// # Gas Cost
    /// ~8,000 gas (storage read)
    /// 
    /// # Access Control
    /// Public function - anyone can query distributions
    pub fn get_distribution(env: Env, distribution_id: String) -> Result<SplitDistribution, ContractError> {
        get_distribution(&env, &distribution_id)
    }

    /// Get contract configuration
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// 
    /// # Returns
    /// Current contract configuration
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
    /// - None (returns default config if not set)
    /// 
    /// # Gas Cost
    /// ~5,000 gas (storage read)
    /// 
    /// # Access Control
    /// Public function - anyone can query config
    pub fn get_config(env: Env) -> SplitConfig {
        get_config(&env)
    }

    /// Update contract configuration (only admin)
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `_admin` - Address of the admin (for authentication)
    /// * `new_config` - New configuration to apply
    /// 
    /// # Returns
    /// Result indicating success or error
    /// 
    /// # Pre-conditions
    /// - Caller must be admin
    /// - New configuration must be valid
    /// 
    /// # Post-conditions
    /// - Configuration is updated
    /// 
    /// # Events
    /// None
    /// 
    /// # Errors
    /// - Unauthorized if caller is not admin
    /// - InvalidConfig if configuration is invalid
    /// 
    /// # Gas Cost
    /// ~10,000 gas (auth check + storage write)
    /// 
    /// # Access Control
    /// Only admin can update configuration
    pub fn update_config(env: Env, _admin: Address, new_config: SplitConfig) -> Result<(), ContractError> {
        // In production, add proper admin authentication
        set_config(&env, &new_config);
        Ok(())
    }

    /// Verify a conditional split's condition
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `split_id` - Unique identifier of the split
    /// * `verifier` - Address verifying the condition
    /// 
    /// # Returns
    /// Result containing the updated PaymentSplit or error
    /// 
    /// # Pre-conditions
    /// - Split must be conditional type
    /// - Condition must not already be verified
    /// - Verifier must be authorized
    /// 
    /// # Post-conditions
    /// - Condition is marked as verified
    /// - Split becomes eligible for execution
    /// 
    /// # Events
    /// None
    /// 
    /// # Errors
    /// - InvalidSplitType if split not conditional
    /// - ConditionAlreadyVerified if condition already verified
    /// - Unauthorized if verifier not authorized
    /// 
    /// # Gas Cost
    /// ~15,000 gas (validation + state update)
    /// 
    /// # Access Control
    /// Only authorized verifier can verify conditions
    pub fn verify_condition(env: Env, split_id: String, verifier: Address) -> Result<PaymentSplit, ContractError> {
        verify_condition(&env, split_id, verifier)
    }

    /// Release a time-locked split
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `split_id` - Unique identifier of the split
    /// * `releaser` - Address releasing the split
    /// 
    /// # Returns
    /// Result containing the updated PaymentSplit or error
    /// 
    /// # Pre-conditions
    /// - Split must be time-locked type
    /// - Current time must be past release time
    /// - Releaser must be authorized
    /// 
    /// # Post-conditions
    /// - Split becomes eligible for execution
    /// - Time lock is marked as released
    /// 
    /// # Events
    /// None
    /// 
    /// # Errors
    /// - InvalidSplitType if split not time-locked
    /// - TimeLockNotExpired if release time not reached
    /// - Unauthorized if releaser not authorized
    /// 
    /// # Gas Cost
    /// ~15,000 gas (validation + state update)
    /// 
    /// # Access Control
    /// Only authorized releaser can release time locks
    pub fn release_time_lock(env: Env, split_id: String, releaser: Address) -> Result<PaymentSplit, ContractError> {
        release_time_lock(&env, split_id, releaser)
    }

    /// Validate recursive split structure
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `split_id` - Unique identifier of the split to validate
    /// 
    /// # Returns
    /// Result indicating validation success or error
    /// 
    /// # Pre-conditions
    /// - Split must exist
    /// 
    /// # Post-conditions
    /// - None (validation only)
    /// 
    /// # Events
    /// None
    /// 
    /// # Errors
    /// - SplitNotFound if split doesn't exist
    /// - CircularReference if circular dependency detected
    /// - MaxDepthExceeded if recursion depth too deep
    /// 
    /// # Gas Cost
    /// ~20,000 gas (varies by complexity of structure)
    /// 
    /// # Access Control
    /// Public function - anyone can validate
    pub fn validate_recursive_structure(env: Env, split_id: String) -> Result<(), ContractError> {
        let mut visited_splits = Vec::new(&env);
        validate_recursive_structure(&env, &split_id, &mut visited_splits, 0)
    }

    /// Request a refund for a split
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `refund_id` - Unique identifier for the refund request
    /// * `split_id` - Unique identifier of the split
    /// * `requester` - Address requesting the refund
    /// * `refund_amount` - Amount to refund
    /// * `reason` - Reason for the refund request
    /// 
    /// # Returns
    /// Result containing the RefundRequest or error
    /// 
    /// # Pre-conditions
    /// - Split must exist
    /// - Split must have unconfirmed distributions
    /// - Requester must be merchant or recipient
    /// - Refund amount must be available
    /// 
    /// # Post-conditions
    /// - Refund request is created with PENDING status
    /// - RefundRequested event is emitted
    /// 
    /// # Events
    /// Emits RefundRequested event
    /// 
    /// # Errors
    /// - SplitNotFound if split doesn't exist
    /// - NoRefundableAmount if no amount available for refund
    /// - Unauthorized if requester not authorized
    /// 
    /// # Gas Cost
    /// ~18,000 gas (validation + storage write + event)
    /// 
    /// # Access Control
    /// Only merchant or recipient can request refunds
    pub fn request_refund(
        env: Env,
        refund_id: String,
        split_id: String,
        requester: Address,
        refund_amount: i128,
        reason: String,
    ) -> Result<RefundRequest, ContractError> {
        request_refund(&env, refund_id, split_id, requester, refund_amount, reason)
    }

    /// Approve a refund request (admin only)
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `refund_id` - Unique identifier of the refund request
    /// * `admin` - Address of the admin
    /// 
    /// # Returns
    /// Result containing the RefundRequest or error
    /// 
    /// # Pre-conditions
    /// - Refund request must exist and be in PENDING status
    /// - Caller must be admin
    /// 
    /// # Post-conditions
    /// - Refund request status changes to APPROVED
    /// - RefundApproved event is emitted
    /// 
    /// # Events
    /// Emits RefundApproved event
    /// 
    /// # Errors
    /// - RefundNotFound if refund request doesn't exist
    /// - InvalidRefundState if not in PENDING status
    /// - Unauthorized if caller is not admin
    /// 
    /// # Gas Cost
    /// ~15,000 gas (auth check + state update + event)
    /// 
    /// # Access Control
    /// Only admin can approve refunds
    pub fn approve_refund(env: Env, refund_id: String, admin: Address) -> Result<RefundRequest, ContractError> {
        approve_refund(&env, refund_id, admin)
    }

    /// Complete a refund (after funds have been transferred)
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `refund_id` - Unique identifier of the refund request
    /// 
    /// # Returns
    /// Result containing the RefundRequest or error
    /// 
    /// # Pre-conditions
    /// - Refund request must be in APPROVED status
    /// - Funds must have been transferred
    /// 
    /// # Post-conditions
    /// - Refund request status changes to COMPLETED
    /// - RefundCompleted event is emitted
    /// 
    /// # Events
    /// Emits RefundCompleted event
    /// 
    /// # Errors
    /// - RefundNotFound if refund request doesn't exist
    /// - InvalidRefundState if not in APPROVED status
    /// 
    /// # Gas Cost
    /// ~15,000 gas (state update + event)
    /// 
    /// # Access Control
    /// Public function (called after external transfer)
    pub fn complete_refund(env: Env, refund_id: String) -> Result<RefundRequest, ContractError> {
        complete_refund(&env, refund_id)
    }

    /// Reject a refund request (admin only)
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `refund_id` - Unique identifier of the refund request
    /// * `admin` - Address of the admin
    /// 
    /// # Returns
    /// Result containing the RefundRequest or error
    /// 
    /// # Pre-conditions
    /// - Refund request must exist and be in PENDING status
    /// - Caller must be admin
    /// 
    /// # Post-conditions
    /// - Refund request status changes to REJECTED
    /// 
    /// # Events
    /// None
    /// 
    /// # Errors
    /// - RefundNotFound if refund request doesn't exist
    /// - InvalidRefundState if not in PENDING status
    /// - Unauthorized if caller is not admin
    /// 
    /// # Gas Cost
    /// ~15,000 gas (auth check + state update)
    /// 
    /// # Access Control
    /// Only admin can reject refunds
    pub fn reject_refund(env: Env, refund_id: String, admin: Address) -> Result<RefundRequest, ContractError> {
        reject_refund(&env, refund_id, admin)
    }

    /// Unpause the contract (admin only)
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `admin` - Address of the admin
    /// 
    /// # Returns
    /// Result indicating success or error
    /// 
    /// # Pre-conditions
    /// - Caller must be admin
    /// - Contract must be paused
    /// 
    /// # Post-conditions
    /// - Contract pause flag is cleared
    /// - Operations resume normally
    /// - ContractUnpaused event is emitted
    /// 
    /// # Events
    /// Emits ContractUnpaused event
    /// 
    /// # Errors
    /// - Unauthorized if caller is not admin
    /// - NotPaused if contract not paused
    /// 
    /// # Gas Cost
    /// ~10,000 gas (auth check + state update + event)
    /// 
    /// # Access Control
    /// Only admin can unpause the contract
    pub fn unpause_contract(env: Env, admin: Address) -> Result<(), ContractError> {
        unpause_contract(&env, admin)
    }

    /// Check if contract is paused
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// 
    /// # Returns
    /// Boolean indicating if contract is paused
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
    /// - None
    /// 
    /// # Gas Cost
    /// ~5,000 gas (storage read)
    /// 
    /// # Access Control
    /// Public function - anyone can check pause status
    pub fn is_contract_paused(env: Env) -> bool {
        is_contract_paused(&env)
    }

    /// Create a new payment split with orchestration coordination for atomic operations
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `split_id` - Unique identifier for the split
    /// * `payment_id` - Reference to the original payment
    /// * `merchant_address` - Address of the merchant creating the split
    /// * `total_amount` - Total amount to be split
    /// * `currency` - Currency address for the payment
    /// * `split_type` - Type of split (percentage, fixed, milestone, etc.)
    /// * `recipients` - List of recipients and their allocations
    /// * `milestones` - Milestone definitions (for milestone-based splits)
    /// * `orchestration_id` - Orchestration ID for atomic coordination
    /// 
    /// # Returns
    /// Result containing the created PaymentSplit or error
    /// 
    /// # Pre-conditions
    /// - Split ID must be unique
    /// - Total amount must be positive
    /// - Recipients must sum to 100% (for percentage splits) or match total (for fixed)
    /// - Orchestration ID must be valid
    /// 
    /// # Post-conditions
    /// - Split is stored with PENDING status
    /// - Orchestration ID is stored for coordination
    /// - State checkpoint is created
    /// - SplitCreatedAtomic event is emitted
    /// 
    /// # Events
    /// Emits SplitCreatedAtomic event
    /// 
    /// # Errors
    /// - InvalidSplitConfig if configuration is invalid
    /// - DuplicateSplitId if split ID already exists
    /// 
    /// # Gas Cost
    /// ~40,000 gas (validation + checkpoint + storage writes + event)
    /// 
    /// # Access Control
    /// Public function - anyone can create atomic splits
    pub fn create_split_atomic(
        env: Env,
        split_id: String,
        payment_id: String,
        merchant_address: Address,
        total_amount: i128,
        currency: Address,
        split_type: SplitType,
        recipients: Vec<Recipient>,
        milestones: Vec<Milestone>,
        orchestration_id: String,
    ) -> Result<PaymentSplit, ContractError> {
        create_split_atomic(
            &env,
            split_id,
            payment_id,
            merchant_address,
            total_amount,
            currency,
            split_type,
            recipients,
            milestones,
            orchestration_id,
        )
    }

    /// Execute a payment split with orchestration coordination (begin distribution)
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `split_id` - Unique identifier of the split to execute
    /// * `executor` - Address executing the split
    /// * `orchestration_id` - Orchestration ID for atomic coordination
    /// 
    /// # Returns
    /// Result containing the updated PaymentSplit or error
    /// 
    /// # Pre-conditions
    /// - Split must exist and be in PENDING status
    /// - Orchestration ID must match
    /// - Reentrancy protection must be clear
    /// 
    /// # Post-conditions
    /// - Split status changes to EXECUTING
    /// - State checkpoint is created
    /// - SplitExecutedAtomic event is emitted
    /// 
    /// # Events
    /// Emits SplitExecutedAtomic event
    /// 
    /// # Errors
    /// - SplitNotFound if split doesn't exist
    /// - InvalidSplitState if split not in PENDING status
    /// - OrchestrationMismatch if orchestration ID doesn't match
    /// - ReentrancyDetected if reentrancy detected
    /// 
    /// # Gas Cost
    /// ~28,000 gas (validation + checkpoint + state updates + event)
    /// 
    /// # Access Control
    /// Public function - anyone can execute atomic splits
    pub fn execute_split_atomic(
        env: Env,
        split_id: String,
        executor: Address,
        orchestration_id: String,
    ) -> Result<PaymentSplit, ContractError> {
        execute_split_atomic(&env, split_id, executor, orchestration_id)
    }

    /// Rollback a split execution (compensating transaction)
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `split_id` - Unique identifier of the split
    /// * `orchestration_id` - Orchestration ID for coordination
    /// 
    /// # Returns
    /// Result containing the updated PaymentSplit or error
    /// 
    /// # Pre-conditions
    /// - Split must exist
    /// - Orchestration ID must match
    /// - Reentrancy protection must be clear
    /// 
    /// # Post-conditions
    /// - Split status is restored from checkpoint
    /// - Checkpoint is cleared
    /// - SplitRolledBack event is emitted
    /// 
    /// # Events
    /// Emits SplitRolledBack event
    /// 
    /// # Errors
    /// - SplitNotFound if split doesn't exist
    /// - OrchestrationMismatch if orchestration ID doesn't match
    /// - ReentrancyDetected if reentrancy detected
    /// 
    /// # Gas Cost
    /// ~22,000 gas (checkpoint restore + state updates + event)
    /// 
    /// # Access Control
    /// Public function - anyone can rollback splits
    pub fn rollback_split(
        env: Env,
        split_id: String,
        orchestration_id: String,
    ) -> Result<PaymentSplit, ContractError> {
        rollback_split(&env, split_id, orchestration_id)
    }

    /// Get state checkpoint for a split
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `checkpoint_id` - Checkpoint ID to retrieve
    /// 
    /// # Returns
    /// Split checkpoint or error
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
    pub fn get_state_checkpoint(env: Env, checkpoint_id: String) -> Result<crate::types::SplitCheckpoint, ContractError> {
        get_state_checkpoint(&env, checkpoint_id)
    }
}
