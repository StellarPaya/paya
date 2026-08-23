#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, String};

mod logic;
mod storage;
mod types;

/// Subscription Contract
/// 
/// This contract manages recurring billing subscriptions on the Stellar network.
/// It handles subscription plans, customer subscriptions, billing cycles, proration,
/// and dunning management for failed payments. The contract integrates with other
/// Paya contracts for payment processing and merchant vault management.
/// 
/// # Design Goals
/// - Flexible subscription plan configuration
/// - Automated billing cycle management
/// - Proration for plan changes and cancellations
/// - Dunning management for failed payments
/// - Integration with Payment Registry and Merchant Vault contracts
/// - Emergency pause functionality for critical situations
/// 
/// # Storage Layout
/// - Admin address stored under "ADMIN" key
/// - Fee percentage stored under "FEE_PERCENTAGE" key
/// - Integration contract addresses stored under respective keys
/// - Subscription plans stored under plan_id keys
/// - Customer subscriptions stored under subscription_id keys
/// - Emergency pause flag stored under "PAUSED" key
/// 
/// # Events
/// - PlanCreated: Emitted when a new subscription plan is created
/// - SubscriptionCreated: Emitted when a customer subscribes
/// - BillingProcessed: Emitted when billing cycle completes
/// - SubscriptionCancelled: Emitted when subscription is cancelled
/// - SubscriptionPaused: Emitted when subscription is paused
/// - SubscriptionResumed: Emitted when subscription is resumed
/// - EmergencyPause: Emitted when contract is paused
/// 
/// # Gas Cost Estimates
/// - initialize: ~12,000 gas
/// - set_integration_contracts: ~15,000 gas
/// - create_plan: ~20,000 gas
/// - subscribe: ~25,000 gas
/// - process_billing: ~30,000 gas
/// - cancel_subscription: ~18,000 gas
/// - pause_subscription: ~15,000 gas
/// - resume_subscription: ~15,000 gas
/// 
/// # Security Considerations
/// - Only admin can set integration contracts and emergency pause
/// - Only merchant can create plans for their business
/// - Only customer or merchant can cancel subscriptions
/// - Fee calculation uses checked arithmetic to prevent overflow
/// - Emergency pause to stop all operations if critical issue detected
/// - Integration contracts are validated before use
#[contract]
pub struct SubscriptionContract;

#[contractimpl]
impl SubscriptionContract {
    /// Initializes the contract with admin and fee configuration
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `admin` - Stellar address of the contract administrator
    /// * `fee_percentage` - Platform fee percentage (basis points, 100 = 1%)
    /// 
    /// # Pre-conditions
    /// - Admin must not already be set
    /// - Fee percentage must be reasonable (0-10000 basis points)
    /// 
    /// # Post-conditions
    /// - Admin address is stored
    /// - Fee percentage is stored
    /// - Contract is ready for use
    /// 
    /// # Events
    /// None
    /// 
    /// # Errors
    /// - Panics if admin already set
    /// - Panics if fee percentage invalid
    /// 
    /// # Gas Cost
    /// ~12,000 gas (storage writes)
    /// 
    /// # Access Control
    /// Can only be called once during initialization
    pub fn initialize(env: Env, admin: Address, fee_percentage: u64) {
        logic::initialize(&env, admin, fee_percentage);
    }

    /// Sets integration contract addresses for external contract calls
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `merchant_vault` - Address of the Merchant Vault contract
    /// * `payment_registry` - Address of the Payment Registry contract
    /// * `caller` - Address of the authorized caller (admin)
    /// 
    /// # Returns
    /// Result indicating success or error
    /// 
    /// # Pre-conditions
    /// - Caller must be admin
    /// - Contract addresses must be valid
    /// - Contracts must be deployed and callable
    /// 
    /// # Post-conditions
    /// - Integration contract addresses are stored
    /// - Contract can now interact with external contracts
    /// 
    /// # Events
    /// None
    /// 
    /// # Errors
    /// - NotAuthorized if caller is not admin
    /// - InvalidContractAddress if any address is invalid
    /// 
    /// # Gas Cost
    /// ~15,000 gas (auth check + storage writes)
    /// 
    /// # Access Control
    /// Only admin can set integration contracts
    pub fn set_integration_contracts(
        env: Env,
        merchant_vault: Address,
        payment_registry: Address,
        caller: Address,
    ) -> Result<(), types::Error> {
        logic::set_integration_contracts(&env, merchant_vault, payment_registry, caller)
    }

    /// Creates a new subscription plan
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `merchant` - Stellar address of the merchant creating the plan
    /// * `amount` - Subscription amount in smallest currency units
    /// * `interval` - Billing interval in seconds (e.g., 2592000 for monthly)
    /// * `max_cycles` - Optional maximum number of billing cycles
    /// 
    /// # Returns
    /// Result containing the plan ID or error
    /// 
    /// # Pre-conditions
    /// - Merchant must be authorized
    /// - Amount must be positive
    /// - Interval must be reasonable (at least 1 hour)
    /// - Integration contracts must be set
    /// 
    /// # Post-conditions
    /// - Plan is stored with unique ID
    /// - PlanCreated event is emitted
    /// 
    /// # Events
    /// Emits PlanCreated event with plan details
    /// 
    /// # Errors
    /// - NotAuthorized if caller is not merchant
    /// - InvalidAmount if amount is not positive
    /// - InvalidInterval if interval is too short
    /// - IntegrationNotSet if integration contracts not configured
    /// 
    /// # Gas Cost
    /// ~20,000 gas (validation + storage write + event)
    /// 
    /// # Access Control
    /// Only merchant can create plans
    pub fn create_plan(
        env: Env,
        merchant: Address,
        amount: i128,
        interval: u64,
        max_cycles: Option<u32>,
    ) -> Result<String, types::Error> {
        logic::create_plan(&env, merchant, amount, interval, max_cycles)
    }

    /// Subscribes a customer to a plan
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `customer` - Stellar address of the customer
    /// * `plan_id` - ID of the plan to subscribe to
    /// 
    /// # Returns
    /// Result containing the subscription ID or error
    /// 
    /// # Pre-conditions
    /// - Plan must exist and be active
    /// - Customer must not already have active subscription to this plan
    /// - Customer must have sufficient balance for first payment
    /// - Integration contracts must be set
    /// 
    /// # Post-conditions
    /// - Subscription is created with ACTIVE status
    /// - First payment is processed
    /// - Next billing date is calculated
    /// - SubscriptionCreated event is emitted
    /// 
    /// # Events
    /// Emits SubscriptionCreated event with subscription details
    /// 
    /// # Errors
    /// - PlanNotFound if plan doesn't exist
    /// - PlanNotActive if plan is not active
    /// - AlreadySubscribed if customer already subscribed
    /// - InsufficientBalance if customer lacks funds
    /// - IntegrationNotSet if integration contracts not configured
    /// 
    /// # Gas Cost
    /// ~25,000 gas (validation + payment processing + storage writes + events)
    /// 
    /// # Access Control
    /// Anyone can subscribe (customer self-subscription)
    pub fn subscribe(
        env: Env,
        customer: Address,
        plan_id: String,
    ) -> Result<String, types::Error> {
        logic::subscribe(&env, customer, plan_id)
    }

    /// Processes a billing cycle for a subscription
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `subscription_id` - ID of the subscription to bill
    /// 
    /// # Returns
    /// Result containing the billing event or error
    /// 
    /// # Pre-conditions
    /// - Subscription must exist and be active
    /// - Current time must be past next billing date
    /// - Customer must have sufficient balance
    /// - Integration contracts must be set
    /// 
    /// # Post-conditions
    /// - Payment is processed
    /// - Next billing date is updated
    /// - Cycle count is incremented
    /// - Subscription may be cancelled if max cycles reached
    /// - BillingProcessed event is emitted
    /// 
    /// # Events
    /// Emits BillingProcessed event with billing details
    /// 
    /// # Errors
    /// - SubscriptionNotFound if subscription doesn't exist
    /// - SubscriptionNotActive if subscription not active
    /// - BillingNotDue if billing date not reached
    /// - InsufficientBalance if customer lacks funds
    /// - IntegrationNotSet if integration contracts not configured
    /// - MaxCyclesReached if subscription completed all cycles
    /// 
    /// # Gas Cost
    /// ~30,000 gas (validation + payment processing + state updates + events)
    /// 
    /// # Access Control
    /// Public function (typically called by backend cron job)
    pub fn process_billing(
        env: Env,
        subscription_id: String,
    ) -> Result<types::BillingEvent, types::Error> {
        logic::process_billing(&env, subscription_id)
    }

    /// Cancels a subscription
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `subscription_id` - ID of the subscription to cancel
    /// * `caller` - Address of the caller
    /// 
    /// # Returns
    /// Result indicating success or error
    /// 
    /// # Pre-conditions
    /// - Subscription must exist and be active
    /// - Caller must be customer or merchant
    /// 
    /// # Post-conditions
    /// - Subscription status changes to CANCELLED
    /// - Prorated refund may be processed
    /// - SubscriptionCancelled event is emitted
    /// 
    /// # Events
    /// Emits SubscriptionCancelled event
    /// 
    /// # Errors
    /// - SubscriptionNotFound if subscription doesn't exist
    /// - SubscriptionNotActive if subscription not active
    /// - Unauthorized if caller is not customer or merchant
    /// 
    /// # Gas Cost
    /// ~18,000 gas (validation + state updates + event)
    /// 
    /// # Access Control
    /// Only customer or merchant can cancel subscription
    pub fn cancel_subscription(
        env: Env,
        subscription_id: String,
        caller: Address,
    ) -> Result<(), types::Error> {
        logic::cancel_subscription(&env, subscription_id, caller)
    }

    /// Pauses a subscription
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `subscription_id` - ID of the subscription to pause
    /// * `caller` - Address of the caller
    /// 
    /// # Returns
    /// Result indicating success or error
    /// 
    /// # Pre-conditions
    /// - Subscription must exist and be active
    /// - Caller must be customer or merchant
    /// 
    /// # Post-conditions
    /// - Subscription status changes to PAUSED
    /// - Billing cycle is suspended
    /// - SubscriptionPaused event is emitted
    /// 
    /// # Events
    /// Emits SubscriptionPaused event
    /// 
    /// # Errors
    /// - SubscriptionNotFound if subscription doesn't exist
    /// - SubscriptionNotActive if subscription not active
    /// - Unauthorized if caller is not customer or merchant
    /// 
    /// # Gas Cost
    /// ~15,000 gas (validation + state updates + event)
    /// 
    /// # Access Control
    /// Only customer or merchant can pause subscription
    pub fn pause_subscription(
        env: Env,
        subscription_id: String,
        caller: Address,
    ) -> Result<(), types::Error> {
        logic::pause_subscription(&env, subscription_id, caller)
    }

    /// Resumes a paused subscription
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `subscription_id` - ID of the subscription to resume
    /// * `caller` - Address of the caller
    /// 
    /// # Returns
    /// Result indicating success or error
    /// 
    /// # Pre-conditions
    /// - Subscription must exist and be paused
    /// - Caller must be customer or merchant
    /// 
    /// # Post-conditions
    /// - Subscription status changes to ACTIVE
    /// - Billing cycle resumes
    /// - Next billing date is recalculated
    /// - SubscriptionResumed event is emitted
    /// 
    /// # Events
    /// Emits SubscriptionResumed event
    /// 
    /// # Errors
    /// - SubscriptionNotFound if subscription doesn't exist
    /// - SubscriptionNotPaused if subscription not paused
    /// - Unauthorized if caller is not customer or merchant
    /// 
    /// # Gas Cost
    /// ~15,000 gas (validation + state updates + event)
    /// 
    /// # Access Control
    /// Only customer or merchant can resume subscription
    pub fn resume_subscription(
        env: Env,
        subscription_id: String,
        caller: Address,
    ) -> Result<(), types::Error> {
        logic::resume_subscription(&env, subscription_id, caller)
    }

    /// Gets subscription details
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `subscription_id` - ID of the subscription to retrieve
    /// 
    /// # Returns
    /// Result containing the Subscription or error
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
    /// - SubscriptionNotFound if subscription doesn't exist
    /// 
    /// # Gas Cost
    /// ~8,000 gas (storage read)
    /// 
    /// # Access Control
    /// Public function - anyone can query subscriptions
    pub fn get_subscription(
        env: Env,
        subscription_id: String,
    ) -> Result<types::Subscription, types::Error> {
        logic::get_subscription(&env, subscription_id)
    }

    /// Gets plan details
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `plan_id` - ID of the plan to retrieve
    /// 
    /// # Returns
    /// Option containing the SubscriptionPlan or None if not found
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
    /// - None (returns None if plan doesn't exist)
    /// 
    /// # Gas Cost
    /// ~8,000 gas (storage read)
    /// 
    /// # Access Control
    /// Public function - anyone can query plans
    pub fn get_plan(
        env: Env,
        plan_id: String,
    ) -> Option<types::SubscriptionPlan> {
        storage::get_plan(&env, &plan_id)
    }

    /// Sets emergency pause status (admin only)
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `paused` - Whether to pause or unpause the contract
    /// * `caller` - Address of the caller
    /// 
    /// # Returns
    /// Result indicating success or error
    /// 
    /// # Pre-conditions
    /// - Caller must be admin
    /// 
    /// # Post-conditions
    /// - Pause flag is set or cleared
    /// - All state-changing operations are blocked if paused
    /// - EmergencyPause event is emitted
    /// 
    /// # Events
    /// Emits EmergencyPause event
    /// 
    /// # Errors
    /// - NotAuthorized if caller is not admin
    /// 
    /// # Gas Cost
    /// ~10,000 gas (auth check + state update + event)
    /// 
    /// # Access Control
    /// Only admin can set emergency pause
    pub fn set_emergency_pause(
        env: Env,
        paused: bool,
        caller: Address,
    ) -> Result<(), types::Error> {
        logic::set_emergency_pause(&env, paused, caller)
    }

    /// Checks if contract is in emergency pause mode
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
    pub fn is_emergency_pause(env: Env) -> bool {
        storage::is_emergency_pause(&env)
    }

    /// Gets the platform fee percentage
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// 
    /// # Returns
    /// Option containing the fee percentage (basis points) or None if not set
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
    /// - None (returns None if not set)
    /// 
    /// # Gas Cost
    /// ~5,000 gas (storage read)
    /// 
    /// # Access Control
    /// Public function - anyone can query fee percentage
    pub fn get_fee_percentage(env: Env) -> Option<u64> {
        storage::get_fee_percentage(&env)
    }

    /// Gets the admin address
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// 
    /// # Returns
    /// Option containing the admin address or None if not set
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
    /// - None (returns None if not set)
    /// 
    /// # Gas Cost
    /// ~5,000 gas (storage read)
    /// 
    /// # Access Control
    /// Public function - anyone can query admin
    pub fn get_admin(env: Env) -> Option<Address> {
        storage::get_admin(&env)
    }
}

#[cfg(test)]
mod test;
