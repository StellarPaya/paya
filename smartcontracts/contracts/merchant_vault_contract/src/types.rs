use soroban_sdk::{contracttype, contracterror, Address, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    VaultAdmin,
    MerchantBalance(Address),
    PendingDeposit(Address, String), // merchant_address, orchestration_id
    DepositCheckpoint(String), // orchestration_id
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MerchantBalance {
    pub merchant_address: Address,
    pub usdc_balance: i128,
    pub locked_balance: i128,
    pub last_updated: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PendingDeposit {
    pub merchant_address: Address,
    pub amount: i128,
    pub orchestration_id: String,
    pub created_at: u64,
    pub status: DepositStatus,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DepositStatus {
    Pending,
    Committed,
    RolledBack,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DepositCheckpoint {
    pub orchestration_id: String,
    pub merchant_address: Address,
    pub previous_balance: i128,
    pub amount: i128,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WithdrawalRequest {
    pub amount: i128,
    pub destination: Address,
    pub timestamp: u64,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotAuthorized = 1,
    InvalidAmount = 2,
    InsufficientBalance = 3,
    DepositNotFound = 4,
    InvalidDepositStatus = 5,
    OrchestrationMismatch = 6,
}
