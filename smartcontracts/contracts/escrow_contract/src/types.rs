use soroban_sdk::{contracttype, contracterror, Address};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    EscrowAdmin,
    EscrowState(Address), // Using Address as a placeholder for escrow ID/participant
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotAuthorized = 1,
}
