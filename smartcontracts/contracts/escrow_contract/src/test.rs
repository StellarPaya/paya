use soroban_sdk::{testutils::{Address as _, Ledger}, Address, Env, String};
use crate::{
    types::{Error, EscrowStatus},
    EscrowContract, EscrowContractClient,
};

fn setup_test<'a>(env: &'a Env) -> (EscrowContractClient<'a>, Address, Address, Address, Address) {
    let admin = Address::generate(env);
    let buyer = Address::generate(env);
    let seller = Address::generate(env);
    let currency = Address::generate(env);

    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(env, &contract_id);

    client.initialize(&admin);

    (client, admin, buyer, seller, currency)
}

#[test]
fn test_initialize() {
    let env = Env::default();
    let (_client, _admin, _buyer, _seller, _currency) = setup_test(&env);
    // Initialize completes without panic
    assert!(true);
}

#[test]
fn test_create_escrow_flow() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1000);

    let (client, _admin, buyer, seller, currency) = setup_test(&env);
    let escrow_id = String::from_str(&env, "escrow_001");
    let condition = String::from_str(&env, "goods_delivered");

    let escrow = client
        .create_escrow(
            &escrow_id,
            &buyer,
            &seller,
            &1000,
            &currency,
            &condition,
            &2000, // dispute_deadline > 1000
        );

    assert_eq!(escrow.escrow_id, escrow_id);
    assert_eq!(escrow.buyer, buyer);
    assert_eq!(escrow.seller, seller);
    assert_eq!(escrow.amount, 1000);
    assert_eq!(escrow.status, EscrowStatus::Created);

    let fetched = client.get_escrow(&escrow_id);
    assert_eq!(fetched.amount, 1000);
    assert_eq!(fetched.status, EscrowStatus::Created);
}

#[test]
fn test_release_escrow_happy_path() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1000);

    let (client, _admin, buyer, seller, currency) = setup_test(&env);
    let escrow_id = String::from_str(&env, "escrow_002");
    let condition = String::from_str(&env, "inspection_passed");

    client.create_escrow(
        &escrow_id,
        &buyer,
        &seller,
        &5000,
        &currency,
        &condition,
        &3000,
    );

    let released = client.release_escrow(&escrow_id, &buyer);
    assert_eq!(released.status, EscrowStatus::Released);
    assert_eq!(released.released_at, 1000);

    // Releasing twice fails cleanly with InvalidEscrowState
    let res = client.try_release_escrow(&escrow_id, &buyer);
    assert_eq!(res, Err(Ok(Error::InvalidEscrowState)));
}

#[test]
fn test_release_unauthorized_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1000);

    let (client, _admin, buyer, seller, currency) = setup_test(&env);
    let unauthorized_caller = Address::generate(&env);
    let escrow_id = String::from_str(&env, "escrow_003");
    let condition = String::from_str(&env, "on_delivery");

    client.create_escrow(
        &escrow_id,
        &buyer,
        &seller,
        &2500,
        &currency,
        &condition,
        &4000,
    );

    let res = client.try_release_escrow(&escrow_id, &unauthorized_caller);
    assert_eq!(res, Err(Ok(Error::NotAuthorized)));
}

#[test]
fn test_cancel_escrow_happy_path() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1000);

    let (client, _admin, buyer, seller, currency) = setup_test(&env);
    let escrow_id = String::from_str(&env, "escrow_004");
    let condition = String::from_str(&env, "delivery_pending");

    client.create_escrow(
        &escrow_id,
        &buyer,
        &seller,
        &1200,
        &currency,
        &condition,
        &5000,
    );

    let cancelled = client.cancel_escrow(&escrow_id, &buyer);
    assert_eq!(cancelled.status, EscrowStatus::Cancelled);

    // Cancelling already cancelled escrow fails
    let res = client.try_cancel_escrow(&escrow_id, &buyer);
    assert_eq!(res, Err(Ok(Error::InvalidEscrowState)));
}

#[test]
fn test_cancel_unauthorized_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1000);

    let (client, _admin, buyer, seller, currency) = setup_test(&env);
    let unauthorized_caller = Address::generate(&env);
    let escrow_id = String::from_str(&env, "escrow_005");
    let condition = String::from_str(&env, "delivery_pending");

    client.create_escrow(
        &escrow_id,
        &buyer,
        &seller,
        &800,
        &currency,
        &condition,
        &5000,
    );

    let res = client.try_cancel_escrow(&escrow_id, &unauthorized_caller);
    assert_eq!(res, Err(Ok(Error::NotAuthorized)));
}

#[test]
fn test_cancel_after_expiry_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1000);

    let (client, _admin, buyer, seller, currency) = setup_test(&env);
    let escrow_id = String::from_str(&env, "escrow_006");
    let condition = String::from_str(&env, "condition_a");

    client.create_escrow(
        &escrow_id,
        &buyer,
        &seller,
        &3000,
        &currency,
        &condition,
        &2000,
    );

    // Fast-forward past expiry
    env.ledger().set_timestamp(2001);

    let res = client.try_cancel_escrow(&escrow_id, &buyer);
    assert_eq!(res, Err(Ok(Error::InvalidEscrowState)));
}

#[test]
fn test_dispute_flow_buyer_and_seller() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1000);

    let (client, _admin, buyer, seller, currency) = setup_test(&env);
    let escrow_id = String::from_str(&env, "escrow_007");
    let condition = String::from_str(&env, "milestone_1");

    client.create_escrow(
        &escrow_id,
        &buyer,
        &seller,
        &4000,
        &currency,
        &condition,
        &3000,
    );

    // Seller can dispute
    let disputed = client.dispute_escrow(&escrow_id, &seller);
    assert_eq!(disputed.status, EscrowStatus::Disputed);

    // Further cancel or release after dispute is rejected
    let cancel_res = client.try_cancel_escrow(&escrow_id, &buyer);
    assert_eq!(cancel_res, Err(Ok(Error::InvalidEscrowState)));
}

#[test]
fn test_dispute_unauthorized_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1000);

    let (client, _admin, buyer, seller, currency) = setup_test(&env);
    let stranger = Address::generate(&env);
    let escrow_id = String::from_str(&env, "escrow_008");
    let condition = String::from_str(&env, "milestone_2");

    client.create_escrow(
        &escrow_id,
        &buyer,
        &seller,
        &2000,
        &currency,
        &condition,
        &5000,
    );

    let res = client.try_dispute_escrow(&escrow_id, &stranger);
    assert_eq!(res, Err(Ok(Error::NotAuthorized)));
}

#[test]
fn test_dispute_after_expiry_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1000);

    let (client, _admin, buyer, seller, currency) = setup_test(&env);
    let escrow_id = String::from_str(&env, "escrow_009");
    let condition = String::from_str(&env, "milestone_3");

    client.create_escrow(
        &escrow_id,
        &buyer,
        &seller,
        &1500,
        &currency,
        &condition,
        &2500,
    );

    // Move past deadline
    env.ledger().set_timestamp(3000);

    let res = client.try_dispute_escrow(&escrow_id, &buyer);
    assert_eq!(res, Err(Ok(Error::InvalidEscrowState)));
}

#[test]
fn test_atomic_orchestration_checkpoint_and_rollback() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1000);

    let (client, _admin, buyer, seller, currency) = setup_test(&env);
    let escrow_id = String::from_str(&env, "escrow_atomic_1");
    let condition = String::from_str(&env, "atomic_delivery");
    let orchestration_id = String::from_str(&env, "orch_1001");

    // 1. Create atomic escrow
    let atomic_escrow = client.create_escrow_atomic(
        &escrow_id,
        &buyer,
        &seller,
        &10000,
        &currency,
        &condition,
        &5000,
        &orchestration_id,
    );
    assert_eq!(atomic_escrow.status, EscrowStatus::Created);

    // 2. Checkpoint is created
    let checkpoint = client.get_state_checkpoint(&orchestration_id);
    assert_eq!(checkpoint.escrow_id, escrow_id);
    assert_eq!(checkpoint.previous_status, EscrowStatus::Created);

    // 3. Rollback restores state and cleans checkpoint
    let rolled_back = client.rollback_escrow(&escrow_id, &orchestration_id);
    assert_eq!(rolled_back.status, EscrowStatus::Created);

    let check_after = client.try_get_state_checkpoint(&orchestration_id);
    assert_eq!(check_after, Err(Ok(Error::CheckpointNotFound)));
}
