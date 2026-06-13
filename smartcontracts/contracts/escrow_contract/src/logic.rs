use soroban_sdk::{Env, Address};
use crate::storage;

pub fn initialize(env: &Env, admin: Address) {
    if storage::get_admin(env).is_none() {
        storage::set_admin(env, &admin);
    }
}
