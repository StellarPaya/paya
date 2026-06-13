use soroban_sdk::{contracttype, contracterror, Address};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    VaultAdmin,
    MerchantBalance(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotAuthorized = 1,
}
