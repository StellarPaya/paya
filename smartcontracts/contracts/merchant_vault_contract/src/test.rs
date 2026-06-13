#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, Events}, Address, Env, IntoVal, FromVal};

#[test]
fn test_deposit() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, MerchantVaultContract);
    let client = MerchantVaultContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);

    client.initialize(&admin);

    // 1. Initial deposit
    client.deposit(&merchant, &1000);
    assert_eq!(client.get_merchant_balance(&merchant), 1000);

    // 2. Second deposit
    client.deposit(&merchant, &500);
    assert_eq!(client.get_merchant_balance(&merchant), 1500);

    // 3. Verify event
    let events = env.events().all();
    let event = events.last().unwrap();
    
    // Topics: (Symbol("deposit"), merchant)
    let expected_topics = (soroban_sdk::symbol_short!("deposit"), merchant).into_val(&env);
    assert_eq!(event.1, expected_topics);
    
    // Data: amount (500)
    let amount: i128 = i128::from_val(&env, &event.2);
    assert_eq!(amount, 500);
}
