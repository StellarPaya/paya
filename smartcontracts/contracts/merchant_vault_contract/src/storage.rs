use soroban_sdk::{Env, Address};
use crate::types::{DataKey, MerchantBalance};

pub fn get_admin(env: &Env) -> Option<Address> {
    env.storage().instance().get::<DataKey, Address>(&DataKey::VaultAdmin)
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set::<DataKey, Address>(&DataKey::VaultAdmin, admin);
}

pub fn get_merchant_record(env: &Env, merchant: &Address) -> Option<MerchantBalance> {
    env.storage()
        .instance()
        .get::<DataKey, MerchantBalance>(&DataKey::MerchantBalance(merchant.clone()))
}

pub fn set_merchant_record(env: &Env, merchant: &Address, record: &MerchantBalance) {
    env.storage()
        .instance()
        .set::<DataKey, MerchantBalance>(&DataKey::MerchantBalance(merchant.clone()), record);
}
