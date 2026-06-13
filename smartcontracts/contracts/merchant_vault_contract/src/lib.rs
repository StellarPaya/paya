#![no_std]

use soroban_sdk::{contract, contractimpl, Env, Address};

mod logic;
mod storage;
mod types;

#[contract]
pub struct MerchantVaultContract;

#[contractimpl]
impl MerchantVaultContract {
    pub fn initialize(env: Env, admin: Address) {
        logic::initialize(&env, admin);
    }
}
