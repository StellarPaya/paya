#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, Events}, Address, Env, IntoVal, FromVal, symbol_short};
use crate::types::PaymentStatus;

#[test]
fn test_status_update() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PaymentRegistryContract);
    let client = PaymentRegistryContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let asset = Address::generate(&env);

    // 1. Initialize
    client.initialize(&admin);

    // 2. Create payment
    let amount = 1000i128;
    let payment_id = client.create_payment_record(&merchant, &amount, &asset);

    // 3. Update status (as admin)
    client.update_payment_status(&payment_id, &PaymentStatus::Confirmed);

    // 4. Verify status
    let record = client.get_payment(&payment_id).unwrap();
    assert_eq!(record.status, PaymentStatus::Confirmed);

    // 5. Verify event
    let events = env.events().all();
    let event = events.last().unwrap();
    
    // Topics: (Symbol("PaymentStatusUpdated"), payment_id)
    let expected_topics = (soroban_sdk::Symbol::new(&env, "PaymentStatusUpdated"), payment_id).into_val(&env);
    assert_eq!(event.1, expected_topics);
    
    // Data: status (Confirmed)
    let status: PaymentStatus = PaymentStatus::from_val(&env, &event.2);
    assert_eq!(status, PaymentStatus::Confirmed);
}

#[test]
fn test_status_update_auth() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PaymentRegistryContract);
    let client = PaymentRegistryContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let asset = Address::generate(&env);

    // 1. Initialize
    client.initialize(&admin);

    // 2. Create payment
    let amount = 1000i128;
    let payment_id = client.create_payment_record(&merchant, &amount, &asset);

    // 3. Update status
    client.update_payment_status(&payment_id, &PaymentStatus::Confirmed);

    // 4. Verify auth
    // env.auths() returns a list of authorizations that were recorded during the last top-level contract call.
    let auths = env.auths();
    assert_eq!(auths.len(), 1);
    let (address, _call) = &auths[0];
    assert_eq!(address, &admin);
}
