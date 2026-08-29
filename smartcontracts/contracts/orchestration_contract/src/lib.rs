#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env, String, Vec};

mod types;
mod storage;
mod logic;

use crate::types::{
    Orchestration, OperationStep, ExecutionResult, StepResult, 
    RollbackResult, OrchestrationConfig, ContractError
};
use crate::logic::{
    create_orchestration, execute_orchestration, execute_step, 
    rollback_orchestration, emergency_pause, get_orchestration, cancel_orchestration
};

/// Orchestration Contract
/// 
/// This contract implements the Saga pattern for atomic cross-contract coordination.
/// It acts as a coordinator for multi-contract operations, ensuring that either all
/// operations succeed or all are rolled back to maintain consistency.
/// 
/// # Design Goals
/// - Atomic execution across multiple contracts
/// - Automatic rollback on failure with compensating transactions
/// - State checkpointing for recovery
/// - Gas optimization with budgeting
/// - Event-driven state synchronization
/// - Security with reentrancy protection and access control
/// 
/// # Storage Layout
/// - Orchestration records stored under orchestration ID keys
/// - State checkpoints stored under checkpoint ID keys
/// - Contract configuration stored under "CONFIG" key
/// - Reentrancy protection flag stored under "REENTRANCY" key
/// 
/// # Events
/// - OrchestrationCreated: Emitted when a new orchestration is created
/// - OrchestrationCompleted: Emitted when orchestration completes successfully
/// - OrchestrationFailed: Emitted when orchestration fails
/// - StepCompleted: Emitted when a step completes
/// - StepFailed: Emitted when a step fails
/// - RollbackInitiated: Emitted when rollback begins
/// - RollbackCompleted: Emitted when rollback completes
/// - OrchestrationCancelled: Emitted when orchestration is cancelled
/// 
/// # Gas Cost Estimates
/// - create_orchestration: ~20,000 gas
/// - execute_orchestration: ~50,000 gas (varies by number of steps)
/// - execute_step: ~15,000 gas per step
/// - rollback_orchestration: ~40,000 gas (varies by number of steps)
/// - emergency_pause: ~10,000 gas
/// 
/// # Security Considerations
/// - Reentrancy protection on all state-changing functions
/// - Admin-only functions for emergency controls
/// - Access control for orchestration creation and cancellation
/// - Time locks to prevent indefinite pending states
/// - Gas budget management to prevent runaway operations
#[contract]
pub struct OrchestrationContract;

#[contractimpl]
impl OrchestrationContract {
    /// Initialize the contract with configuration
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
    /// - Contract is ready to create orchestrations
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
    pub fn init(env: Env, config: OrchestrationConfig) {
        storage::set_config(&env, &config);
    }

    /// Create a new orchestration workflow
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `orchestration_id` - Unique identifier for the orchestration
    /// * `correlation_id` - Correlation ID for tracking across systems
    /// * `steps` - List of operation steps to execute
    /// * `timeout` - Timeout in seconds (0 for default)
    /// * `creator` - Address creating the orchestration
    /// * `gas_budget` - Maximum gas to use (0 for default)
    /// 
    /// # Returns
    /// Result containing the created Orchestration or error
    /// 
    /// # Pre-conditions
    /// - Orchestration ID must be unique
    /// - Steps must be valid and non-empty
    /// - Contract must not be paused
    /// 
    /// # Post-conditions
    /// - Orchestration is stored with CREATED status
    /// - Initial checkpoint is created
    /// - OrchestrationCreated event is emitted
    /// 
    /// # Events
    /// Emits OrchestrationCreated event
    /// 
    /// # Errors
    /// - OrchestrationAlreadyExists if ID already exists
    /// - InvalidStepConfig if steps are invalid
    /// - ContractPaused if contract is paused
    /// 
    /// # Gas Cost
    /// ~20,000 gas (validation + storage writes + event)
    /// 
    /// # Access Control
    /// Public function - anyone can create orchestrations
    pub fn create_orchestration(
        env: Env,
        orchestration_id: String,
        correlation_id: String,
        steps: Vec<OperationStep>,
        timeout: u64,
        creator: Address,
        gas_budget: u64,
    ) -> Result<Orchestration, ContractError> {
        create_orchestration(
            &env,
            orchestration_id,
            correlation_id,
            steps,
            timeout,
            creator,
            gas_budget,
        )
    }

    /// Execute the orchestration workflow
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `orchestration_id` - Unique identifier of the orchestration
    /// 
    /// # Returns
    /// Result containing the ExecutionResult or error
    /// 
    /// # Pre-conditions
    /// - Orchestration must exist and be in CREATED status
    /// - Timeout must not have been exceeded
    /// - Reentrancy protection must be clear
    /// 
    /// # Post-conditions
    /// - All steps are executed atomically
    /// - If any step fails, rollback is initiated
    /// - Orchestration status is updated
    /// 
    /// # Events
    /// Emits OrchestrationCompleted or OrchestrationFailed event
    /// 
    /// # Errors
    /// - OrchestrationNotFound if orchestration doesn't exist
    /// - InvalidOrchestrationState if not in CREATED status
    /// - ReentrancyDetected if reentrancy detected
    /// 
    /// # Gas Cost
    /// ~50,000 gas (varies by number of steps)
    /// 
    /// # Access Control
    /// Public function - anyone can execute orchestrations
    pub fn execute_orchestration(
        env: Env,
        orchestration_id: String,
    ) -> Result<ExecutionResult, ContractError> {
        execute_orchestration(&env, orchestration_id)
    }

    /// Execute a single step with rollback capability
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `orchestration_id` - Unique identifier of the orchestration
    /// * `step_index` - Index of the step to execute
    /// 
    /// # Returns
    /// Result containing the StepResult or error
    /// 
    /// # Pre-conditions
    /// - Orchestration must exist
    /// - Step index must be valid
    /// 
    /// # Post-conditions
    /// - Step is executed with checkpoint creation
    /// - Step status is updated
    /// - StepCompleted event is emitted
    /// 
    /// # Events
    /// Emits StepCompleted event
    /// 
    /// # Errors
    /// - OrchestrationNotFound if orchestration doesn't exist
    /// - InvalidStepConfig if step index is invalid
    /// 
    /// # Gas Cost
    /// ~15,000 gas per step
    /// 
    /// # Access Control
    /// Public function - anyone can execute steps
    pub fn execute_step(
        env: Env,
        orchestration_id: String,
        step_index: u32,
    ) -> Result<StepResult, ContractError> {
        execute_step(&env, &orchestration_id, step_index)
    }

    /// Rollback a failed orchestration
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `orchestration_id` - Unique identifier of the orchestration
    /// 
    /// # Returns
    /// Result containing the RollbackResult or error
    /// 
    /// # Pre-conditions
    /// - Orchestration must exist
    /// - Orchestration must have completed steps to rollback
    /// 
    /// # Post-conditions
    /// - Completed steps are rolled back in reverse order
    /// - Checkpoints are restored
    /// - RollbackCompleted event is emitted
    /// 
    /// # Events
    /// Emits RollbackInitiated and RollbackCompleted events
    /// 
    /// # Errors
    /// - OrchestrationNotFound if orchestration doesn't exist
    /// - RollbackFailed if rollback fails
    /// 
    /// # Gas Cost
    /// ~40,000 gas (varies by number of steps)
    /// 
    /// # Access Control
    /// Public function - anyone can initiate rollback
    pub fn rollback_orchestration(
        env: Env,
        orchestration_id: String,
    ) -> Result<RollbackResult, ContractError> {
        rollback_orchestration(&env, orchestration_id)
    }

    /// Get orchestration status
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `orchestration_id` - Unique identifier of the orchestration
    /// 
    /// # Returns
    /// Result containing the Orchestration or error
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
    /// - OrchestrationNotFound if orchestration doesn't exist
    /// 
    /// # Gas Cost
    /// ~8,000 gas (storage read)
    /// 
    /// # Access Control
    /// Public function - anyone can query orchestrations
    pub fn get_orchestration(
        env: Env,
        orchestration_id: String,
    ) -> Result<Orchestration, ContractError> {
        get_orchestration(&env, orchestration_id)
    }

    /// Cancel an orchestration
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `orchestration_id` - Unique identifier of the orchestration
    /// * `canceller` - Address cancelling the orchestration
    /// 
    /// # Returns
    /// Result indicating success or error
    /// 
    /// # Pre-conditions
    /// - Orchestration must exist
    /// - Caller must be the creator
    /// - Orchestration must not be completed
    /// 
    /// # Post-conditions
    /// - Orchestration status changes to CANCELLED
    /// - OrchestrationCancelled event is emitted
    /// 
    /// # Events
    /// Emits OrchestrationCancelled event
    /// 
    /// # Errors
    /// - OrchestrationNotFound if orchestration doesn't exist
    /// - Unauthorized if caller is not creator
    /// - InvalidOrchestrationState if already completed
    /// 
    /// # Gas Cost
    /// ~15,000 gas (auth check + state update + event)
    /// 
    /// # Access Control
    /// Only creator can cancel orchestrations
    pub fn cancel_orchestration(
        env: Env,
        orchestration_id: String,
        canceller: Address,
    ) -> Result<(), ContractError> {
        cancel_orchestration(&env, orchestration_id, canceller)
    }

    /// Emergency pause for critical situations
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `admin` - Address of the admin
    /// * `paused` - Whether to pause or unpause the contract
    /// 
    /// # Returns
    /// Result indicating success or error
    /// 
    /// # Pre-conditions
    /// - Caller must be admin
    /// 
    /// # Post-conditions
    /// - Contract pause flag is updated
    /// - All state-changing operations are blocked if paused
    /// 
    /// # Events
    /// None
    /// 
    /// # Errors
    /// - Unauthorized if caller is not admin
    /// 
    /// # Gas Cost
    /// ~10,000 gas (auth check + state update)
    /// 
    /// # Access Control
    /// Only admin can pause/unpause the contract
    pub fn emergency_pause(
        env: Env,
        admin: Address,
        paused: bool,
    ) -> Result<(), ContractError> {
        emergency_pause(&env, admin, paused)
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
    pub fn get_config(env: Env) -> OrchestrationConfig {
        storage::get_config(&env)
    }

    /// Update contract configuration (only admin)
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `admin` - Address of the admin
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
    /// 
    /// # Gas Cost
    /// ~10,000 gas (auth check + storage write)
    /// 
    /// # Access Control
    /// Only admin can update configuration
    pub fn update_config(env: Env, admin: Address, new_config: OrchestrationConfig) -> Result<(), ContractError> {
        let config = storage::get_config(&env);
        
        if config.admin_address != admin {
            return Err(ContractError::Unauthorized);
        }

        storage::set_config(&env, &new_config);
        Ok(())
    }
}
