use soroban_sdk::{Env, Symbol, String, Address, symbol_short};
use crate::types::{PaymentSplit, SplitDistribution, SplitConfig, RefundRequest, SecurityConfig, ContractError, SplitCheckpoint};

const DATA_KEY_SPLIT: Symbol = symbol_short!("SPLIT");
const DATA_KEY_DISTRIBUTION: Symbol = symbol_short!("DIST");
const DATA_KEY_CONFIG: Symbol = symbol_short!("CONF");
const DATA_KEY_REFUND: Symbol = symbol_short!("REFD");
const DATA_KEY_SECURITY: Symbol = symbol_short!("SECU");
const DATA_KEY_REENTRANCY: Symbol = symbol_short!("RENT");
const DATA_KEY_CHECKPOINT: Symbol = symbol_short!("CHKP");

pub fn get_split(env: &Env, split_id: &String) -> Result<PaymentSplit, ContractError> {
    let key = (DATA_KEY_SPLIT, split_id.clone());
    env.storage()
        .persistent()
        .get(&key)
        .ok_or(ContractError::SplitNotFound)
}

pub fn set_split(env: &Env, split_id: &String, split: &PaymentSplit) {
    let key = (DATA_KEY_SPLIT, split_id.clone());
    env.storage().persistent().set(&key, split);
}

pub fn get_distribution(env: &Env, distribution_id: &String) -> Result<SplitDistribution, ContractError> {
    let key = (DATA_KEY_DISTRIBUTION, distribution_id.clone());
    env.storage()
        .persistent()
        .get(&key)
        .ok_or(ContractError::SplitNotFound)
}

pub fn set_distribution(env: &Env, distribution_id: &String, distribution: &SplitDistribution) {
    let key = (DATA_KEY_DISTRIBUTION, distribution_id.clone());
    env.storage().persistent().set(&key, distribution);
}

pub fn get_config(env: &Env) -> SplitConfig {
    let key = DATA_KEY_CONFIG;
    env.storage()
        .persistent()
        .get(&key)
        .unwrap_or(SplitConfig {
            max_recipients: 50,
            max_retries: 3,
            min_split_percentage: 1,
            max_split_percentage: 100,
            require_merchant_approval: true,
            enable_auto_retry: true,
        })
}

pub fn set_config(env: &Env, config: &SplitConfig) {
    let key = DATA_KEY_CONFIG;
    env.storage().persistent().set(&key, config);
}

pub fn has_split(env: &Env, split_id: &String) -> bool {
    let key = (DATA_KEY_SPLIT, split_id.clone());
    env.storage().persistent().has(&key)
}

pub fn remove_split(env: &Env, split_id: &String) {
    let key = (DATA_KEY_SPLIT, split_id.clone());
    env.storage().persistent().remove(&key);
}

pub fn get_refund_request(env: &Env, refund_id: &String) -> Result<RefundRequest, ContractError> {
    let key = (DATA_KEY_REFUND, refund_id.clone());
    env.storage()
        .persistent()
        .get(&key)
        .ok_or(ContractError::SplitNotFound)
}

pub fn set_refund_request(env: &Env, refund_id: &String, refund: &RefundRequest) {
    let key = (DATA_KEY_REFUND, refund_id.clone());
    env.storage().persistent().set(&key, refund);
}

pub fn get_security_config(env: &Env) -> SecurityConfig {
    let key = DATA_KEY_SECURITY;
    let default_config = SecurityConfig {
        admin_address: Address::from_string(&String::from_str(env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")),
        paused: false,
        reentrancy_guard: false,
        max_recursive_depth: 5,
        refund_fee_percentage: 1,
        emergency_withdraw_enabled: false,
    };
    env.storage()
        .persistent()
        .get(&key)
        .unwrap_or(default_config)
}

pub fn set_security_config(env: &Env, config: &SecurityConfig) {
    let key = DATA_KEY_SECURITY;
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

pub fn get_split_checkpoint(env: &Env, checkpoint_id: &String) -> Result<SplitCheckpoint, ContractError> {
    let key = (DATA_KEY_CHECKPOINT, checkpoint_id.clone());
    env.storage()
        .persistent()
        .get(&key)
        .ok_or(ContractError::CheckpointNotFound)
}

pub fn set_split_checkpoint(env: &Env, checkpoint_id: &String, checkpoint: &SplitCheckpoint) {
    let key = (DATA_KEY_CHECKPOINT, checkpoint_id.clone());
    env.storage().persistent().set(&key, checkpoint);
}

pub fn remove_split_checkpoint(env: &Env, checkpoint_id: &String) {
    let key = (DATA_KEY_CHECKPOINT, checkpoint_id.clone());
    env.storage().persistent().remove(&key);
}
