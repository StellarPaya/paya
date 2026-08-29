use soroban_sdk::{contracttype, Address, String, Vec, Symbol, Map, contracterror};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    SplitNotFound = 1,
    InvalidPercentage = 2,
    InvalidAmount = 3,
    SplitAlreadyExecuted = 4,
    SplitCancelled = 5,
    InsufficientBalance = 6,
    InvalidRecipient = 7,
    MilestoneNotTriggered = 8,
    MaxRetriesExceeded = 9,
    Unauthorized = 10,
    ContractPaused = 11,
    ReentrancyDetected = 12,
    CircularReference = 13,
    MaxDepthExceeded = 14,
    ConditionNotMet = 15,
    ConditionExpired = 16,
    TimeLockNotExpired = 17,
    RefundNotAllowed = 18,
    RefundAlreadyProcessed = 19,
    InvalidRefundAmount = 20,
    Overflow = 21,
    Underflow = 22,
    InvalidAddress = 23,
    AdminOnly = 24,
    OrchestrationMismatch = 25,
    CheckpointNotFound = 26,
    InvalidSplitState = 27,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum SplitStatus {
    Pending,
    Executing,
    Completed,
    PartiallyCompleted,
    Failed,
    Cancelled,
    Refunded,
    PartiallyRefunded,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum SplitType {
    Percentage,
    FixedAmount,
    Milestone,
    Hybrid,
    Conditional,
    TimeLocked,
    Recursive,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum MilestoneStatus {
    Pending,
    Triggered,
    Completed,
    Skipped,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum ConditionalStatus {
    Pending,
    ConditionMet,
    ConditionFailed,
    Expired,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum RefundStatus {
    None,
    Requested,
    Approved,
    Rejected,
    Processing,
    Completed,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Recipient {
    pub address: Address,
    pub percentage: i128, // For percentage-based splits
    pub fixed_amount: i128, // For fixed amount splits
    pub split_type: SplitType,
    pub distributed_amount: i128,
    pub distribution_status: SplitStatus,
    pub is_recursive: bool, // True if recipient is another split contract
    pub recursive_split_id: String, // ID of recursive split if applicable
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Milestone {
    pub milestone_id: String,
    pub description: String,
    pub trigger_condition: String,
    pub required_amount: i128,
    pub status: MilestoneStatus,
    pub triggered_at: u64,
    pub completed_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConditionalSplit {
    pub condition_id: String,
    pub condition_type: String, // e.g., "oracle", "multisig", "external_contract"
    pub condition_data: Map<String, String>, // Flexible condition parameters
    pub status: ConditionalStatus,
    pub expires_at: u64,
    pub verified_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TimeLockedSplit {
    pub lock_until: u64,
    pub release_automatically: bool,
    pub released_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RecursiveSplitConfig {
    pub parent_split_id: String,
    pub current_depth: u32,
    pub max_depth: u32,
    pub visited_splits: Vec<String>, // For circular reference detection
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentSplit {
    pub split_id: String,
    pub payment_id: String,
    pub merchant_address: Address,
    pub total_amount: i128,
    pub currency: Address,
    pub split_type: SplitType,
    pub status: SplitStatus,
    pub recipients: Vec<Recipient>,
    pub milestones: Vec<Milestone>,
    pub conditional_split: ConditionalSplit,
    pub time_locked_split: TimeLockedSplit,
    pub recursive_config: RecursiveSplitConfig,
    pub created_at: u64,
    pub executed_at: u64,
    pub completed_at: u64,
    pub retry_count: u32,
    pub max_retries: u32,
    pub refund_status: RefundStatus,
    pub refunded_amount: i128,
    pub refund_fee: i128,
    pub orchestration_id: Option<String>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SplitDistribution {
    pub distribution_id: String,
    pub split_id: String,
    pub recipient_address: Address,
    pub amount: i128,
    pub transaction_hash: Symbol,
    pub status: SplitStatus,
    pub attempted_at: u64,
    pub completed_at: u64,
    pub error_message: String,
    pub is_recursive: bool,
    pub parent_distribution_id: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RefundRequest {
    pub refund_id: String,
    pub split_id: String,
    pub requester: Address,
    pub refund_amount: i128,
    pub reason: String,
    pub status: RefundStatus,
    pub requested_at: u64,
    pub approved_at: u64,
    pub completed_at: u64,
    pub fee_amount: i128,
    pub admin_address: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SecurityConfig {
    pub admin_address: Address,
    pub paused: bool,
    pub reentrancy_guard: bool,
    pub max_recursive_depth: u32,
    pub refund_fee_percentage: i128,
    pub emergency_withdraw_enabled: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SplitConfig {
    pub max_recipients: u32,
    pub max_retries: u32,
    pub min_split_percentage: i128,
    pub max_split_percentage: i128,
    pub require_merchant_approval: bool,
    pub enable_auto_retry: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SplitCheckpoint {
    pub checkpoint_id: String,
    pub orchestration_id: String,
    pub split_id: String,
    pub previous_status: SplitStatus,
    pub distributed_amounts: Vec<(Address, i128)>,
    pub timestamp: u64,
}
