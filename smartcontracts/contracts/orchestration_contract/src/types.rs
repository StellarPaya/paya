use soroban_sdk::{contracttype, contracterror, Address, String, Vec, Symbol, Map};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    OrchestrationNotFound = 1,
    InvalidOrchestrationState = 2,
    Unauthorized = 3,
    StepExecutionFailed = 4,
    RollbackFailed = 5,
    TimeoutExceeded = 6,
    InvalidStepConfig = 7,
    OrchestrationAlreadyExists = 8,
    ContractPaused = 9,
    ReentrancyDetected = 10,
    InvalidContractAddress = 11,
    GasBudgetExceeded = 12,
    CheckpointNotFound = 13,
    InvalidCorrelationId = 14,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum OrchestrationStatus {
    Created,
    Executing,
    StepCompleted,
    StepFailed,
    RollingBack,
    RollbackCompleted,
    Completed,
    Cancelled,
    TimedOut,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum StepStatus {
    Pending,
    Executing,
    Completed,
    Failed,
    RollingBack,
    RollbackCompleted,
    Skipped,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum OperationType {
    CreatePayment,
    MarkPaymentPaid,
    DepositToVault,
    CreateSplit,
    ExecuteSplit,
    DistributeToRecipient,
    CreateEscrow,
    ReleaseEscrow,
    RefundEscrow,
    Custom(String),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OperationStep {
    pub step_id: String,
    pub operation_type: OperationType,
    pub contract_address: Address,
    pub function_name: String,
    pub parameters: Vec<String>,
    pub rollback_function: String,
    pub rollback_parameters: Vec<String>,
    pub status: StepStatus,
    pub executed_at: u64,
    pub completed_at: u64,
    pub error_message: String,
    pub retry_count: u32,
    pub max_retries: u32,
    pub gas_estimate: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Orchestration {
    pub orchestration_id: String,
    pub correlation_id: String,
    pub status: OrchestrationStatus,
    pub steps: Vec<OperationStep>,
    pub current_step_index: u32,
    pub timeout: u64,
    pub created_at: u64,
    pub started_at: u64,
    pub completed_at: u64,
    pub creator: Address,
    pub total_gas_used: u64,
    pub gas_budget: u64,
    pub checkpoint_id: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StateCheckpoint {
    pub checkpoint_id: String,
    pub orchestration_id: String,
    pub step_index: u32,
    pub contract_states: Map<Address, String>,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ExecutionResult {
    pub orchestration_id: String,
    pub success: bool,
    pub completed_steps: u32,
    pub total_steps: u32,
    pub total_gas_used: u64,
    pub error_message: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StepResult {
    pub step_id: String,
    pub success: bool,
    pub gas_used: u64,
    pub error_message: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RollbackResult {
    pub orchestration_id: String,
    pub success: bool,
    pub rolled_back_steps: u32,
    pub total_gas_used: u64,
    pub error_message: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OrchestrationConfig {
    pub admin_address: Address,
    pub paused: bool,
    pub max_steps: u32,
    pub default_timeout: u64,
    pub default_gas_budget: u64,
    pub enable_auto_retry: bool,
    pub max_retries: u32,
    pub reentrancy_guard: bool,
}
