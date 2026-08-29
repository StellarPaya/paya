use soroban_sdk::{Env, Address, String};
use crate::types::{DataKey, Escrow, EscrowCheckpoint};

pub fn get_admin(env: &Env) -> Option<Address> {
    env.storage().instance().get::<DataKey, Address>(&DataKey::EscrowAdmin)
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set::<DataKey, Address>(&DataKey::EscrowAdmin, admin);
}

pub fn get_escrow(env: &Env, escrow_id: &String) -> Option<Escrow> {
    env.storage()
        .instance()
        .get::<DataKey, Escrow>(&DataKey::EscrowState(escrow_id.clone()))
}

pub fn set_escrow(env: &Env, escrow_id: &String, escrow: &Escrow) {
    env.storage()
        .instance()
        .set::<DataKey, Escrow>(&DataKey::EscrowState(escrow_id.clone()), escrow);
}

pub fn remove_escrow(env: &Env, escrow_id: &String) {
    env.storage()
        .instance()
        .remove::<DataKey>(&DataKey::EscrowState(escrow_id.clone()));
}

pub fn get_escrow_checkpoint(env: &Env, orchestration_id: &String) -> Option<EscrowCheckpoint> {
    env.storage()
        .instance()
        .get::<DataKey, EscrowCheckpoint>(&DataKey::EscrowCheckpoint(orchestration_id.clone()))
}

pub fn set_escrow_checkpoint(env: &Env, orchestration_id: &String, checkpoint: &EscrowCheckpoint) {
    env.storage()
        .instance()
        .set::<DataKey, EscrowCheckpoint>(&DataKey::EscrowCheckpoint(orchestration_id.clone()), checkpoint);
}

pub fn remove_escrow_checkpoint(env: &Env, orchestration_id: &String) {
    env.storage()
        .instance()
        .remove::<DataKey>(&DataKey::EscrowCheckpoint(orchestration_id.clone()));
}
