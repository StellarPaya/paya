use soroban_sdk::{Env, Address};
use crate::types::DataKey;

pub fn get_admin(env: &Env) -> Option<Address> {
    env.storage().instance().get::<DataKey, Address>(&DataKey::EscrowAdmin)
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set::<DataKey, Address>(&DataKey::EscrowAdmin, admin);
}
