use soroban_sdk::{Env, Address, String};
use crate::types::{DataKey, MerchantBalance, PendingDeposit, DepositCheckpoint};

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

pub fn get_pending_deposit(env: &Env, merchant: &Address, orchestration_id: &String) -> Option<PendingDeposit> {
    env.storage()
        .instance()
        .get::<DataKey, PendingDeposit>(&DataKey::PendingDeposit(merchant.clone(), orchestration_id.clone()))
}

pub fn set_pending_deposit(env: &Env, merchant: &Address, orchestration_id: &String, deposit: &PendingDeposit) {
    env.storage()
        .instance()
        .set::<DataKey, PendingDeposit>(&DataKey::PendingDeposit(merchant.clone(), orchestration_id.clone()), deposit);
}

pub fn remove_pending_deposit(env: &Env, merchant: &Address, orchestration_id: &String) {
    env.storage()
        .instance()
        .remove::<DataKey>(&DataKey::PendingDeposit(merchant.clone(), orchestration_id.clone()));
}

pub fn get_deposit_checkpoint(env: &Env, orchestration_id: &String) -> Option<DepositCheckpoint> {
    env.storage()
        .instance()
        .get::<DataKey, DepositCheckpoint>(&DataKey::DepositCheckpoint(orchestration_id.clone()))
}

pub fn set_deposit_checkpoint(env: &Env, orchestration_id: &String, checkpoint: &DepositCheckpoint) {
    env.storage()
        .instance()
        .set::<DataKey, DepositCheckpoint>(&DataKey::DepositCheckpoint(orchestration_id.clone()), checkpoint);
}

pub fn remove_deposit_checkpoint(env: &Env, orchestration_id: &String) {
    env.storage()
        .instance()
        .remove::<DataKey>(&DataKey::DepositCheckpoint(orchestration_id.clone()));
}
