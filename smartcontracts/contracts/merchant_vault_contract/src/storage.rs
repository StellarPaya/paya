use soroban_sdk::{Env, Address};
use crate::types::DataKey;

pub fn get_admin(env: &Env) -> Option<Address> {
    env.storage().instance().get::<DataKey, Address>(&DataKey::VaultAdmin)
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set::<DataKey, Address>(&DataKey::VaultAdmin, admin);
}

pub fn get_merchant_balance(env: &Env, merchant: &Address) -> i128 {
    env.storage()
        .instance()
        .get::<DataKey, i128>(&DataKey::MerchantBalance(merchant.clone()))
        .unwrap_or(0)
}

pub fn set_merchant_balance(env: &Env, merchant: &Address, balance: i128) {
    env.storage()
        .instance()
        .set::<DataKey, i128>(&DataKey::MerchantBalance(merchant.clone()), &balance);
}
