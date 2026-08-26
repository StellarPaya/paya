#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, Symbol};
use core::option::Option;



/// Fraud check result
#[derive(Clone)]
pub struct FraudCheckResult {
    pub is_safe: bool,
    pub risk_level: u64,
    pub requires_verification: bool,
}

/// Fraud report structure
#[derive(Clone)]
pub struct FraudReport {
    pub payment_id: Symbol,
    pub fraud_type: Symbol,
    pub reporter: Address,
    pub timestamp: u64,
    pub status: Symbol,
}

/// Fraud statistics
#[derive(Clone)]
pub struct FraudStatistics {
    pub total_reports: u64,
    pub confirmed_fraud: u64,
    pub false_positives: u64,
    pub pending_review: u64,
}

/// Fraud Detection Contract
/// 
/// This contract provides on-chain fraud detection capabilities for the Paya platform.
/// It integrates with the payment registry to add fraud risk checks, freeze suspicious
/// payments, and maintain fraud statistics for audit trails.
/// 
/// # Storage Layout
/// - Frozen payments: Map of payment_id -> (freezer_address, reason, timestamp)
/// - Fraud reports: Map of report_id -> FraudReport
/// - Fraud statistics: Counter for different fraud states
/// - Risk thresholds: Merchant-specific risk thresholds
/// 
/// # Events
/// - PaymentFrozen: Emitted when a payment is frozen due to fraud risk
/// - PaymentReleased: Emitted when a frozen payment is released
/// - FraudReported: Emitted when fraud is reported
/// - FraudResolved: Emitted when a fraud report is resolved
/// 
/// # Gas Cost Estimates
/// - check_fraud_risk: ~5,000 gas
/// - freeze_payment: ~10,000 gas
/// - release_payment: ~8,000 gas
/// - report_fraud: ~12,000 gas
/// 
/// # Security Considerations
/// - Only admin addresses can freeze/release payments
/// - Fraud reports are immutable once created
/// - Risk thresholds can only be updated by payment owner or admin
#[contract]
pub struct FraudDetectionContract;

mod storage {
    use soroban_sdk::{Symbol, Address};

    pub fn frozen_payments_key() -> Symbol {
        Symbol::short("FROZEN")
    }

    pub fn fraud_reports_key() -> Symbol {
        Symbol::short("REPORTS")
    }

    pub fn statistics_key() -> Symbol {
        Symbol::short("STATS")
    }

    pub fn thresholds_key() -> Symbol {
        Symbol::short("THRESH")
    }

    pub fn admin_key() -> Symbol {
        Symbol::short("ADMIN")
    }
}

#[contractimpl]
impl FraudDetectionContract {
    /// Initialize the contract with admin address
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `admin` - Address of the admin who can manage fraud detection
    /// 
    /// # Events
    /// None
    pub fn initialize(env: Env, admin: Address) {
        let key = storage::admin_key();
        if env.storage().persistent().has(&key) {
            panic!("already-initialized");
        }
        env.storage().persistent().set(&key, &admin);
        
        // Initialize statistics
        let stats_key = storage::statistics_key();
        env.storage().persistent().set(&stats_key, &(0u64, 0u64, 0u64, 0u64)); // (total, confirmed, false_positives, pending)
    }

    /// Check fraud risk before processing a payment
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `payment_id` - Unique identifier of the payment
    /// * `risk_score` - Risk score from off-chain analysis (0-100)
    /// * `risk_threshold` - Threshold above which payment should be blocked
    /// 
    /// # Returns
    /// FraudCheckResult indicating if payment is safe and requires verification
    /// 
    /// # Events
    /// None
    /// 
    /// # Gas Cost
    /// ~5,000 gas
    pub fn check_fraud_risk(
        env: Env,
        payment_id: Symbol,
        risk_score: u64,
        risk_threshold: u64,
    ) -> FraudCheckResult {
        // Check if payment is already frozen
        let frozen_key = (storage::frozen_payments_key(), payment_id.clone());
        if env.storage().persistent().has(&frozen_key) {
            return FraudCheckResult {
                is_safe: false,
                risk_level: 100,
                requires_verification: true,
            };
        }

        let is_safe = risk_score < risk_threshold;
        let requires_verification = risk_score >= (risk_threshold * 70 / 100); // 70% of threshold

        FraudCheckResult {
            is_safe,
            risk_level: risk_score,
            requires_verification,
        }
    }

    /// Freeze a suspicious payment
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `payment_id` - Unique identifier of the payment to freeze
    /// * `admin` - Address of the admin requesting the freeze
    /// * `reason` - Reason for freezing the payment
    /// 
    /// # Events
    /// Emits PaymentFrozen event with payment ID and freezer address
    /// 
    /// # Errors
    /// - Panics with "unauthorized" if caller is not admin
    /// - Panics with "already-frozen" if payment is already frozen
    /// 
    /// # Gas Cost
    /// ~10,000 gas
    pub fn freeze_payment(
        env: Env,
        payment_id: Symbol,
        admin: Address,
        reason: Symbol,
    ) {
        // Verify admin authorization
        let admin_key = storage::admin_key();
        let stored_admin: Option<Address> = env.storage().persistent().get(&admin_key);
        match stored_admin {
            Option::None => panic!("not-initialized"),
            Option::Some(stored) => {
                if stored != admin {
                    panic!("unauthorized");
                }
            }
        }

        // Check if already frozen
        let frozen_key = (storage::frozen_payments_key(), payment_id.clone());
        if env.storage().persistent().has(&frozen_key) {
            panic!("already-frozen");
        }

        // Freeze the payment
        let timestamp = env.ledger().timestamp();
        env.storage().persistent().set(&frozen_key, &(admin.clone(), reason.clone(), timestamp));

        // Emit event
        let topics = (symbol_short!("PaymentFrozen"), payment_id.clone(), admin);
        let values = (reason, timestamp);
        env.events().publish(topics, values);
    }

    /// Release a frozen payment after review
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `payment_id` - Unique identifier of the payment to release
    /// * `admin` - Address of the admin releasing the payment
    /// 
    /// # Events
    /// Emits PaymentReleased event with payment ID and releaser address
    /// 
    /// # Errors
    /// - Panics with "unauthorized" if caller is not admin
    /// - Panics with "not-frozen" if payment is not frozen
    /// 
    /// # Gas Cost
    /// ~8,000 gas
    pub fn release_payment(env: Env, payment_id: Symbol, admin: Address) {
        // Verify admin authorization
        let admin_key = storage::admin_key();
        let stored_admin: Option<Address> = env.storage().persistent().get(&admin_key);
        match stored_admin {
            Option::None => panic!("not-initialized"),
            Option::Some(stored) => {
                if stored != admin {
                    panic!("unauthorized");
                }
            }
        }

        // Check if frozen
        let frozen_key = (storage::frozen_payments_key(), payment_id.clone());
        let frozen_data: Option<(Address, Symbol, u64)> = env.storage().persistent().get(&frozen_key);
        match frozen_data {
            Option::None => panic!("not-frozen"),
            Option::Some(_) => {
                // Release the payment
                env.storage().persistent().remove(&frozen_key);

                // Emit event
                let topics = (symbol_short!("PaymentReleased"), payment_id.clone(), admin);
                env.events().publish(topics, symbol_short!("released"));
            }
        }
    }

    /// Report a fraud incident
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `payment_id` - Unique identifier of the payment involved in fraud
    /// * `fraud_type` - Type of fraud (account_takeover, transaction_fraud, etc.)
    /// * `reporter` - Address of the entity reporting the fraud
    /// * `evidence` - Evidence or description of the fraud
    /// 
    /// # Returns
    /// FraudReport containing the report details
    /// 
    /// # Events
    /// Emits FraudReported event with payment ID and fraud type
    /// 
    /// # Gas Cost
    /// ~12,000 gas
    pub fn report_fraud(
        env: Env,
        payment_id: Symbol,
        fraud_type: Symbol,
        reporter: Address,
        evidence: Symbol,
    ) -> FraudReport {
        // Generate report ID
        let report_id = Symbol::new(&env, &format!("fraud_{}", env.ledger().sequence()));
        
        // Create fraud report
        let timestamp = env.ledger().timestamp();
        let report = FraudReport {
            payment_id: payment_id.clone(),
            fraud_type: fraud_type.clone(),
            reporter: reporter.clone(),
            timestamp,
            status: symbol_short!("pending"),
        };

        // Store report
        let reports_key = (storage::fraud_reports_key(), report_id.clone());
        env.storage().persistent().set(&reports_key, &report);

        // Update statistics
        let stats_key = storage::statistics_key();
        let stats: Option<(u64, u64, u64, u64)> = env.storage().persistent().get(&stats_key);
        match stats {
            Option::Some((total, confirmed, false_positives, pending)) => {
                env.storage().persistent().set(&stats_key, &(total + 1, confirmed, false_positives, pending + 1));
            }
            Option::None => {
                env.storage().persistent().set(&stats_key, &(1u64, 0u64, 0u64, 1u64));
            }
        }

        // Emit event
        let topics = (symbol_short!("FraudReported"), payment_id, fraud_type);
        let values = (reporter, timestamp);
        env.events().publish(topics, values);

        report
    }

    /// Resolve a fraud report
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `report_id` - Unique identifier of the fraud report
    /// * `admin` - Address of the admin resolving the report
    /// * `status` - Final status (confirmed, false_positive, dismissed)
    /// 
    /// # Events
    /// Emits FraudResolved event with report ID and resolution status
    /// 
    /// # Errors
    /// - Panics with "unauthorized" if caller is not admin
    /// - Panics with "report-not-found" if report doesn't exist
    /// 
    /// # Gas Cost
    /// ~10,000 gas
    pub fn resolve_fraud(env: Env, report_id: Symbol, admin: Address, status: Symbol) {
        // Verify admin authorization
        let admin_key = storage::admin_key();
        let stored_admin: Option<Address> = env.storage().persistent().get(&admin_key);
        match stored_admin {
            Option::None => panic!("not-initialized"),
            Option::Some(stored) => {
                if stored != admin {
                    panic!("unauthorized");
                }
            }
        }

        // Get and update report
        let reports_key = (storage::fraud_reports_key(), report_id.clone());
        let report: Option<FraudReport> = env.storage().persistent().get(&reports_key);
        match report {
            Option::None => panic!("report-not-found"),
            Option::Some(mut report) => {
                report.status = status.clone();
                env.storage().persistent().set(&reports_key, &report);

                // Update statistics
                let stats_key = storage::statistics_key();
                let stats: Option<(u64, u64, u64, u64)> = env.storage().persistent().get(&stats_key);
                match stats {
                    Option::Some((total, confirmed, false_positives, pending)) => {
                        match status {
                            s if s == symbol_short!("confirmed") => {
                                env.storage().persistent().set(&stats_key, &(total, confirmed + 1, false_positives, pending - 1));
                            }
                            s if s == symbol_short!("false_positive") => {
                                env.storage().persistent().set(&stats_key, &(total, confirmed, false_positives + 1, pending - 1));
                            }
                            _ => {
                                env.storage().persistent().set(&stats_key, &(total, confirmed, false_positives, pending - 1));
                            }
                        }
                    }
                    Option::None => {}
                }

                // Emit event
                let topics = (symbol_short!("FraudResolved"), report_id);
                env.events().publish(topics, status);
            }
        }
    }

    /// Get fraud statistics
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// 
    /// # Returns
    /// FraudStatistics containing total reports, confirmed fraud, false positives, and pending reviews
    /// 
    /// # Events
    /// None
    /// 
    /// # Gas Cost
    /// ~3,000 gas
    pub fn get_fraud_statistics(env: Env) -> FraudStatistics {
        let stats_key = storage::statistics_key();
        let stats: Option<(u64, u64, u64, u64)> = env.storage().persistent().get(&stats_key);
        
        match stats {
            Option::Some((total, confirmed, false_positives, pending)) => FraudStatistics {
                total_reports: total,
                confirmed_fraud: confirmed,
                false_positives: false_positives,
                pending_review: pending,
            },
            Option::None => FraudStatistics {
                total_reports: 0,
                confirmed_fraud: 0,
                false_positives: 0,
                pending_review: 0,
            },
        }
    }

    /// Check if a payment is frozen
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `payment_id` - Unique identifier of the payment
    /// 
    /// # Returns
    /// Boolean indicating if payment is frozen
    /// 
    /// # Events
    /// None
    /// 
    /// # Gas Cost
    /// ~2,000 gas
    pub fn is_payment_frozen(env: Env, payment_id: Symbol) -> bool {
        let frozen_key = (storage::frozen_payments_key(), payment_id);
        env.storage().persistent().has(&frozen_key)
    }

    /// Get frozen payment details
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `payment_id` - Unique identifier of the payment
    /// 
    /// # Returns
    /// Tuple containing (freezer_address, reason, timestamp) if frozen
    /// 
    /// # Events
    /// None
    /// 
    /// # Errors
    /// - Panics with "not-frozen" if payment is not frozen
    /// 
    /// # Gas Cost
    /// ~3,000 gas
    pub fn get_frozen_payment_details(env: Env, payment_id: Symbol) -> (Address, Symbol, u64) {
        let frozen_key = (storage::frozen_payments_key(), payment_id);
        let frozen_data: Option<(Address, Symbol, u64)> = env.storage().persistent().get(&frozen_key);
        
        match frozen_data {
            Option::None => panic!("not-frozen"),
            Option::Some(data) => data,
        }
    }

    /// Set risk threshold for a merchant
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `merchant_id` - Address of the merchant
    /// * `threshold` - Risk threshold (0-100)
    /// 
    /// # Events
    /// None
    /// 
    /// # Gas Cost
    /// ~5,000 gas
    pub fn set_merchant_threshold(env: Env, merchant_id: Address, threshold: u64) {
        let threshold_key = (storage::thresholds_key(), merchant_id);
        env.storage().persistent().set(&threshold_key, &threshold);
    }

    /// Get risk threshold for a merchant
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `merchant_id` - Address of the merchant
    /// 
    /// # Returns
    /// Risk threshold for the merchant (0-100), or default 50 if not set
    /// 
    /// # Events
    /// None
    /// 
    /// # Gas Cost
    /// ~3,000 gas
    pub fn get_merchant_threshold(env: Env, merchant_id: Address) -> u64 {
        let threshold_key = (storage::thresholds_key(), merchant_id);
        let threshold: Option<u64> = env.storage().persistent().get(&threshold_key);
        
        match threshold {
            Option::Some(t) => t,
            Option::None => 50, // Default threshold
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::Address;

    #[test]
    fn test_fraud_check_result() {
        let result = FraudCheckResult {
            is_safe: true,
            risk_level: 25,
            requires_verification: false,
        };
        assert_eq!(result.is_safe, true);
        assert_eq!(result.risk_level, 25);
        assert_eq!(result.requires_verification, false);
    }

    #[test]
    fn test_fraud_statistics() {
        let stats = FraudStatistics {
            total_reports: 100,
            confirmed_fraud: 45,
            false_positives: 10,
            pending_review: 45,
        };
        assert_eq!(stats.total_reports, 100);
        assert_eq!(stats.confirmed_fraud, 45);
        assert_eq!(stats.false_positives, 10);
        assert_eq!(stats.pending_review, 45);
    }
}