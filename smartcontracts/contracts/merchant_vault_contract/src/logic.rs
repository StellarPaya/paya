use soroban_sdk::{Env, Address, symbol_short, String};
use crate::storage;
use crate::types::{MerchantBalance, Error, PendingDeposit, DepositStatus, DepositCheckpoint};

pub fn initialize(env: &Env, admin: Address) {
    if storage::get_admin(env).is_none() {
        storage::set_admin(env, &admin);
    }
}

pub fn deposit(env: &Env, merchant: Address, amount: i128) -> Result<(), Error> {
    // 1. Authorization: Only admin can credit the vault (oracle flow)
    let admin = storage::get_admin(env).ok_or(Error::NotAuthorized)?;
    admin.require_auth();

    // 2. Fetch or initialize record
    let mut record = storage::get_merchant_record(env, &merchant).unwrap_or(MerchantBalance {
        merchant_address: merchant.clone(),
        usdc_balance: 0,
        locked_balance: 0,
        last_updated: 0,
    });

    // 3. Update state
    record.usdc_balance += amount;
    record.last_updated = env.ledger().timestamp();

    // 4. Persistence
    storage::set_merchant_record(env, &merchant, &record);

    // 5. Event
    env.events().publish(
        (symbol_short!("deposit"), merchant),
        amount
    );

    Ok(())
}

pub fn deposit_atomic(env: &Env, merchant: Address, amount: i128, orchestration_id: String) -> Result<(), Error> {
    // 1. Authorization: Only admin can credit the vault (oracle flow)
    let admin = storage::get_admin(env).ok_or(Error::NotAuthorized)?;
    admin.require_auth();

    // 2. Validate amount
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }

    // 3. Fetch or initialize record
    let mut record = storage::get_merchant_record(env, &merchant).unwrap_or(MerchantBalance {
        merchant_address: merchant.clone(),
        usdc_balance: 0,
        locked_balance: 0,
        last_updated: 0,
    });

    // 4. Create checkpoint before modification
    let checkpoint = DepositCheckpoint {
        orchestration_id: orchestration_id.clone(),
        merchant_address: merchant.clone(),
        previous_balance: record.usdc_balance,
        amount,
        timestamp: env.ledger().timestamp(),
    };
    storage::set_deposit_checkpoint(env, &orchestration_id, &checkpoint);

    // 5. Lock the amount in pending state
    record.locked_balance += amount;
    storage::set_merchant_record(env, &merchant, &record);

    // 6. Create pending deposit record
    let pending_deposit = PendingDeposit {
        merchant_address: merchant.clone(),
        amount,
        orchestration_id: orchestration_id.clone(),
        created_at: env.ledger().timestamp(),
        status: DepositStatus::Pending,
    };
    storage::set_pending_deposit(env, &merchant, &orchestration_id, &pending_deposit);

    // 7. Event
    env.events().publish(
        (symbol_short!("deposit_pending"), merchant),
        (amount, orchestration_id.clone())
    );

    Ok(())
}

pub fn commit_deposit(env: &Env, merchant: Address, orchestration_id: String) -> Result<(), Error> {
    // 1. Authorization: Only admin can commit deposits
    let admin = storage::get_admin(env).ok_or(Error::NotAuthorized)?;
    admin.require_auth();

    // 2. Get pending deposit
    let pending_deposit = storage::get_pending_deposit(env, &merchant, &orchestration_id)
        .ok_or(Error::DepositNotFound)?;

    // 3. Verify status
    if pending_deposit.status != DepositStatus::Pending {
        return Err(Error::InvalidDepositStatus);
    }

    // 4. Fetch merchant record
    let mut record = storage::get_merchant_record(env, &merchant)
        .ok_or(Error::InsufficientBalance)?;

    // 5. Move from locked to available balance
    record.locked_balance -= pending_deposit.amount;
    record.usdc_balance += pending_deposit.amount;
    record.last_updated = env.ledger().timestamp();

    // 6. Update pending deposit status
    let mut updated_deposit = pending_deposit;
    updated_deposit.status = DepositStatus::Committed;
    storage::set_pending_deposit(env, &merchant, &orchestration_id, &updated_deposit);

    // 7. Update merchant record
    storage::set_merchant_record(env, &merchant, &record);

    // 8. Clear checkpoint
    storage::remove_deposit_checkpoint(env, &orchestration_id);

    // 9. Event
    env.events().publish(
        (symbol_short!("deposit_committed"), merchant),
        (pending_deposit.amount, orchestration_id.clone())
    );

    Ok(())
}

pub fn rollback_deposit(env: &Env, merchant: Address, orchestration_id: String) -> Result<(), Error> {
    // 1. Authorization: Only admin can rollback deposits
    let admin = storage::get_admin(env).ok_or(Error::NotAuthorized)?;
    admin.require_auth();

    // 2. Get pending deposit
    let pending_deposit = storage::get_pending_deposit(env, &merchant, &orchestration_id)
        .ok_or(Error::DepositNotFound)?;

    // 3. Verify orchestration ID matches
    if pending_deposit.orchestration_id != orchestration_id {
        return Err(Error::OrchestrationMismatch);
    }

    // 4. Verify status
    if pending_deposit.status != DepositStatus::Pending {
        return Err(Error::InvalidDepositStatus);
    }

    // 5. Fetch merchant record
    let mut record = storage::get_merchant_record(env, &merchant)
        .ok_or(Error::InsufficientBalance)?;

    // 6. Restore from checkpoint
    if let Some(checkpoint) = storage::get_deposit_checkpoint(env, &orchestration_id) {
        record.usdc_balance = checkpoint.previous_balance;
        record.locked_balance -= pending_deposit.amount;
        record.last_updated = env.ledger().timestamp();
    }

    // 7. Update pending deposit status
    let mut updated_deposit = pending_deposit;
    updated_deposit.status = DepositStatus::RolledBack;
    storage::set_pending_deposit(env, &merchant, &orchestration_id, &updated_deposit);

    // 8. Update merchant record
    storage::set_merchant_record(env, &merchant, &record);

    // 9. Clear checkpoint
    storage::remove_deposit_checkpoint(env, &orchestration_id);

    // 10. Event
    env.events().publish(
        (symbol_short!("deposit_rolled_back"), merchant),
        (pending_deposit.amount, orchestration_id.clone())
    );

    Ok(())
}

pub fn get_state_checkpoint(env: &Env, orchestration_id: String) -> Result<DepositCheckpoint, Error> {
    storage::get_deposit_checkpoint(env, &orchestration_id)
        .ok_or(Error::DepositNotFound)
}
