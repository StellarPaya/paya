use soroban_sdk::{Env, Address, String, symbol_short};
use crate::storage;
use crate::types::{Escrow, EscrowStatus, EscrowCheckpoint, Error};

pub fn initialize(env: &Env, admin: Address) {
    if storage::get_admin(env).is_none() {
        storage::set_admin(env, &admin);
    }
}

pub fn create_escrow_atomic(
    env: &Env,
    escrow_id: String,
    buyer: Address,
    seller: Address,
    amount: i128,
    currency: Address,
    release_condition: String,
    dispute_deadline: u64,
    orchestration_id: String,
) -> Result<Escrow, Error> {
    // Check if escrow already exists
    if storage::get_escrow(env, &escrow_id).is_some() {
        return Err(Error::EscrowNotFound);
    }

    // Create checkpoint
    let checkpoint_id = format!("{}_create", orchestration_id);
    let checkpoint = EscrowCheckpoint {
        checkpoint_id: checkpoint_id.clone(),
        orchestration_id: orchestration_id.clone(),
        escrow_id: escrow_id.clone(),
        previous_status: EscrowStatus::Created,
        previous_amount: 0,
        timestamp: env.ledger().timestamp(),
    };
    storage::set_escrow_checkpoint(env, &orchestration_id, &checkpoint);

    // Create escrow with orchestration ID
    let escrow = Escrow {
        escrow_id: escrow_id.clone(),
        buyer,
        seller,
        amount,
        currency,
        status: EscrowStatus::Created,
        release_condition,
        dispute_deadline,
        created_at: env.ledger().timestamp(),
        funded_at: 0,
        released_at: 0,
        orchestration_id: Some(orchestration_id),
    };

    storage::set_escrow(env, &escrow_id, &escrow);

    // Emit event
    env.events().publish(
        (symbol_short!("escrow_created_atomic"), escrow_id.clone()),
        (escrow_id.clone(), amount)
    );

    Ok(escrow)
}

pub fn release_escrow_atomic(
    env: &Env,
    escrow_id: String,
    orchestration_id: String,
) -> Result<Escrow, Error> {
    let mut escrow = storage::get_escrow(env, &escrow_id)
        .ok_or(Error::EscrowNotFound)?;

    // Verify orchestration ID matches
    if escrow.orchestration_id != Some(orchestration_id.clone()) {
        return Err(Error::OrchestrationMismatch);
    }

    // Validate state
    if escrow.status != EscrowStatus::Funded {
        return Err(Error::InvalidEscrowState);
    }

    // Create checkpoint before release
    let checkpoint_id = format!("{}_release", orchestration_id);
    let checkpoint = EscrowCheckpoint {
        checkpoint_id: checkpoint_id.clone(),
        orchestration_id: orchestration_id.clone(),
        escrow_id: escrow_id.clone(),
        previous_status: escrow.status.clone(),
        previous_amount: escrow.amount,
        timestamp: env.ledger().timestamp(),
    };
    storage::set_escrow_checkpoint(env, &orchestration_id, &checkpoint);

    // Update status
    escrow.status = EscrowStatus::Released;
    escrow.released_at = env.ledger().timestamp();
    storage::set_escrow(env, &escrow_id, &escrow);

    // Emit event
    env.events().publish(
        (symbol_short!("escrow_released_atomic"), escrow_id.clone()),
        (escrow_id.clone(), escrow.amount)
    );

    Ok(escrow)
}

pub fn rollback_escrow(
    env: &Env,
    escrow_id: String,
    orchestration_id: String,
) -> Result<Escrow, Error> {
    let mut escrow = storage::get_escrow(env, &escrow_id)
        .ok_or(Error::EscrowNotFound)?;

    // Verify orchestration ID matches
    if escrow.orchestration_id != Some(orchestration_id.clone()) {
        return Err(Error::OrchestrationMismatch);
    }

    // Restore from checkpoint
    if let Some(checkpoint) = storage::get_escrow_checkpoint(env, &orchestration_id) {
        escrow.status = checkpoint.previous_status;
        escrow.amount = checkpoint.previous_amount;
        escrow.released_at = 0;
    } else {
        // If no checkpoint, revert to Created
        escrow.status = EscrowStatus::Created;
        escrow.released_at = 0;
    }

    storage::set_escrow(env, &escrow_id, &escrow);

    // Clear checkpoint
    storage::remove_escrow_checkpoint(env, &orchestration_id);

    // Emit rollback event
    env.events().publish(
        (symbol_short!("escrow_rolled_back"), escrow_id.clone()),
        escrow_id.clone()
    );

    Ok(escrow)
}

pub fn get_state_checkpoint(env: &Env, orchestration_id: String) -> Result<EscrowCheckpoint, Error> {
    storage::get_escrow_checkpoint(env, &orchestration_id)
        .ok_or(Error::CheckpointNotFound)
}
