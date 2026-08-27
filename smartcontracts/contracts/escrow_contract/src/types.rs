use soroban_sdk::{contracttype, contracterror, Address, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    EscrowAdmin,
    EscrowState(String), // escrow_id
    EscrowCheckpoint(String), // orchestration_id
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowStatus {
    Created,
    Funded,
    Released,
    Refunded,
    Disputed,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Escrow {
    pub escrow_id: String,
    pub buyer: Address,
    pub seller: Address,
    pub amount: i128,
    pub currency: Address,
    pub status: EscrowStatus,
    pub release_condition: String,
    pub dispute_deadline: u64,
    pub created_at: u64,
    pub funded_at: u64,
    pub released_at: u64,
    pub orchestration_id: Option<String>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowCheckpoint {
    pub checkpoint_id: String,
    pub orchestration_id: String,
    pub escrow_id: String,
    pub previous_status: EscrowStatus,
    pub previous_amount: i128,
    pub timestamp: u64,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotAuthorized = 1,
    InvalidEscrowState = 2,
    EscrowNotFound = 3,
    InsufficientFunds = 4,
    OrchestrationMismatch = 5,
    CheckpointNotFound = 6,
}
