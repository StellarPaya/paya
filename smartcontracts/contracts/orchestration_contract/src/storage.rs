use soroban_sdk::{Env, Symbol, String, Address, symbol_short};
use crate::types::{Orchestration, StateCheckpoint, OrchestrationConfig, ContractError};

const DATA_KEY_ORCHESTRATION: Symbol = symbol_short!("ORCH");
const DATA_KEY_CHECKPOINT: Symbol = symbol_short!("CHKP");
const DATA_KEY_CONFIG: Symbol = symbol_short!("CONF");
const DATA_KEY_REENTRANCY: Symbol = symbol_short!("RENT");

pub fn get_orchestration(env: &Env, orchestration_id: &String) -> Result<Orchestration, ContractError> {
    let key = (DATA_KEY_ORCHESTRATION, orchestration_id.clone());
    env.storage()
        .persistent()
        .get(&key)
        .ok_or(ContractError::OrchestrationNotFound)
}

pub fn set_orchestration(env: &Env, orchestration_id: &String, orchestration: &Orchestration) {
    let key = (DATA_KEY_ORCHESTRATION, orchestration_id.clone());
    env.storage().persistent().set(&key, orchestration);
}

pub fn has_orchestration(env: &Env, orchestration_id: &String) -> bool {
    let key = (DATA_KEY_ORCHESTRATION, orchestration_id.clone());
    env.storage().persistent().has(&key)
}

pub fn remove_orchestration(env: &Env, orchestration_id: &String) {
    let key = (DATA_KEY_ORCHESTRATION, orchestration_id.clone());
    env.storage().persistent().remove(&key);
}

pub fn get_checkpoint(env: &Env, checkpoint_id: &String) -> Result<StateCheckpoint, ContractError> {
    let key = (DATA_KEY_CHECKPOINT, checkpoint_id.clone());
    env.storage()
        .persistent()
        .get(&key)
        .ok_or(ContractError::CheckpointNotFound)
}

pub fn set_checkpoint(env: &Env, checkpoint_id: &String, checkpoint: &StateCheckpoint) {
    let key = (DATA_KEY_CHECKPOINT, checkpoint_id.clone());
    env.storage().persistent().set(&key, checkpoint);
}

pub fn remove_checkpoint(env: &Env, checkpoint_id: &String) {
    let key = (DATA_KEY_CHECKPOINT, checkpoint_id.clone());
    env.storage().persistent().remove(&key);
}

pub fn get_config(env: &Env) -> OrchestrationConfig {
    let key = DATA_KEY_CONFIG;
    let default_config = OrchestrationConfig {
        admin_address: Address::from_string(&String::from_str(env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")),
        paused: false,
        max_steps: 50,
        default_timeout: 86400, // 24 hours in seconds
        default_gas_budget: 100000000, // 100 million gas units
        enable_auto_retry: true,
        max_retries: 3,
        reentrancy_guard: false,
    };
    env.storage()
        .persistent()
        .get(&key)
        .unwrap_or(default_config)
}

pub fn set_config(env: &Env, config: &OrchestrationConfig) {
    let key = DATA_KEY_CONFIG;
    env.storage().persistent().set(&key, config);
}

pub fn get_reentrancy_guard(env: &Env) -> bool {
    let key = DATA_KEY_REENTRANCY;
    env.storage()
        .temporary()
        .get(&key)
        .unwrap_or(false)
}

pub fn set_reentrancy_guard(env: &Env, guard: bool) {
    let key = DATA_KEY_REENTRANCY;
    env.storage().temporary().set(&key, &guard);
}

pub fn clear_reentrancy_guard(env: &Env) {
    let key = DATA_KEY_REENTRANCY;
    env.storage().temporary().remove(&key);
}
