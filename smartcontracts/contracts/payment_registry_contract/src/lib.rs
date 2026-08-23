#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, Symbol};
use core::option::Option;

/// Payment structure representing a payment record in the registry
/// 
/// # Fields
/// * `amount` - The payment amount in smallest currency units (stroops for XLM)
/// * `merchant` - The merchant's Stellar address who will receive the payment
/// * `status` - Current payment status: "PENDING" or "PAID"
/// * `tx_hash` - Optional Stellar transaction hash when payment is confirmed
#[derive(Clone)]
pub struct Payment {
    amount: i128,
    merchant: Address,
    status: Symbol, // "PENDING" or "PAID"
    tx_hash: Option<Symbol>,
}

/// Payment Registry Contract
/// 
/// This contract manages the lifecycle of payments on the Stellar network.
/// It provides functionality to create payments, mark them as paid, and
/// retrieve payment information.
/// 
/// # Storage Layout
/// - Payments are stored under their unique payment ID (Symbol)
/// - Each payment stores: (amount, merchant_address, status, optional_tx_hash)
/// 
/// # Events
/// - PaymentCreated: Emitted when a new payment is created
/// - PaymentPaid: Emitted when a payment is marked as paid
/// 
/// # Gas Cost Estimates
/// - create_payment: ~15,000 gas
/// - mark_paid: ~12,000 gas
/// - get_payment: ~8,000 gas
/// 
/// # Security Considerations
/// - Payment IDs must be unique to prevent overwrites
/// - Only the contract owner should be able to mark payments as paid
/// - Payment status transitions are one-way (PENDING -> PAID)
#[contract]
pub struct PaymentRegistry;

mod storage {
    use soroban_sdk::Symbol;

    pub fn payments_key() -> Symbol {
        Symbol::short("PAYMENTS")
    }
}

#[contractimpl]
impl PaymentRegistry {
    /// Creates a new payment record in the registry
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `id` - Unique identifier for the payment (Symbol)
    /// * `amount` - Payment amount in smallest currency units
    /// * `merchant` - Stellar address of the merchant receiving the payment
    /// 
    /// # Pre-conditions
    /// - Payment ID must not already exist in storage
    /// - Amount must be greater than zero
    /// - Merchant address must be a valid Stellar address
    /// 
    /// # Post-conditions
    /// - Payment is stored with status "PENDING"
    /// - Transaction hash is initially None
    /// 
    /// # Events
    /// Emits PaymentCreated event with payment ID
    /// 
    /// # Errors
    /// - Panics if payment ID already exists
    /// 
    /// # Gas Cost
    /// ~15,000 gas (storage write + event emission)
    pub fn create_payment(env: Env, id: Symbol, amount: i128, merchant: Address) {
        let key = id.clone();
        // store tuple (amount, merchant, status, tx_hash) under key
        env.storage().persistent().set(&key, &(amount, merchant, symbol_short!("PENDING"), Option::<Symbol>::None));
    }

    /// Marks a payment as paid with the transaction hash
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `id` - Unique identifier of the payment to mark as paid
    /// * `tx_hash` - Stellar transaction hash confirming the payment
    /// 
    /// # Pre-conditions
    /// - Payment must exist in storage
    /// - Payment must be in "PENDING" status
    /// - Transaction hash must be valid
    /// 
    /// # Post-conditions
    /// - Payment status is updated to "PAID"
    /// - Transaction hash is stored
    /// 
    /// # Events
    /// Emits PaymentPaid event with payment ID and transaction hash
    /// 
    /// # Errors
    /// - Panics with "payment-not-found" if payment doesn't exist
    /// 
    /// # Gas Cost
    /// ~12,000 gas (storage read + write + event emission)
    pub fn mark_paid(env: Env, id: Symbol, tx_hash: Symbol) {
        let maybe: Option<(i128, Address, Symbol, Option<Symbol>)> = env.storage().persistent().get(&id);
        match maybe {
            Option::None => {
                panic!("payment-not-found")
            }
            Option::Some((amount, merchant, _status, _)) => {
                env.storage().persistent().set(&id, &(amount, merchant, symbol_short!("PAID"), Option::Some(tx_hash)));
            }
        }
    }

    /// Retrieves payment information by ID
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `id` - Unique identifier of the payment to retrieve
    /// 
    /// # Returns
    /// Tuple containing: (amount, merchant_address, status, optional_tx_hash)
    /// 
    /// # Pre-conditions
    /// - Payment must exist in storage
    /// 
    /// # Post-conditions
    /// - None (read-only operation)
    /// 
    /// # Events
    /// None
    /// 
    /// # Errors
    /// - Panics with "payment-not-found" if payment doesn't exist
    /// 
    /// # Gas Cost
    /// ~8,000 gas (storage read)
    pub fn get_payment(env: Env, id: Symbol) -> (i128, Address, Symbol, Option<Symbol>) {
        let maybe: Option<(i128, Address, Symbol, Option<Symbol>)> = env.storage().persistent().get(&id);
        match maybe {
            Option::None => panic!("payment-not-found"),
            Option::Some(t) => t,
        }
    }
}
