use soroban_sdk::{Env, String};

use crate::types::{DataKey, PaymentRecord, PaymentStatus};

pub fn get_version(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get::<DataKey, u32>(&DataKey::Version)
        .unwrap_or(0)
}

pub fn set_version(env: &Env, version: u32) {
    env.storage()
        .instance()
        .set::<DataKey, u32>(&DataKey::Version, &version);
}

pub fn save_payment(env: &Env, payment_id: String, record: PaymentRecord) {
    env.storage()
        .instance()
        .set::<DataKey, PaymentRecord>(&DataKey::Payment(payment_id), &record);
}

pub fn get_payment(env: &Env, payment_id: String) -> Option<PaymentRecord> {
    env.storage()
        .instance()
        .get::<DataKey, PaymentRecord>(&DataKey::Payment(payment_id))
}

pub fn update_payment_status(env: &Env, payment_id: String, status: PaymentStatus) {
    if let Some(mut record) = get_payment(env, payment_id.clone()) {
        record.status = status;
        save_payment(env, payment_id, record);
    }
}

pub fn payment_exists(env: &Env, payment_id: String) -> bool {
    env.storage()
        .instance()
        .has(&DataKey::Payment(payment_id))
}
