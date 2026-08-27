use soroban_sdk::{Env, Address, String, Vec, Map, symbol_short};
use crate::types::{
    Orchestration, OrchestrationStatus, StepStatus, OperationStep, 
    ExecutionResult, StepResult, RollbackResult, StateCheckpoint, ContractError
};
use crate::storage;

pub fn create_orchestration(
    env: &Env,
    orchestration_id: String,
    correlation_id: String,
    steps: Vec<OperationStep>,
    timeout: u64,
    creator: Address,
    gas_budget: u64,
) -> Result<Orchestration, ContractError> {
    // Check if orchestration already exists
    if storage::has_orchestration(env, &orchestration_id) {
        return Err(ContractError::OrchestrationAlreadyExists);
    }

    // Check if contract is paused
    let config = storage::get_config(env);
    if config.paused {
        return Err(ContractError::ContractPaused);
    }

    // Validate steps
    if steps.is_empty() {
        return Err(ContractError::InvalidStepConfig);
    }

    if steps.len() > config.max_steps as usize {
        return Err(ContractError::InvalidStepConfig);
    }

    // Create checkpoint ID
    let checkpoint_id = format!("{}_init", orchestration_id);

    // Create orchestration
    let orchestration = Orchestration {
        orchestration_id: orchestration_id.clone(),
        correlation_id,
        status: OrchestrationStatus::Created,
        steps,
        current_step_index: 0,
        timeout: if timeout == 0 { config.default_timeout } else { timeout },
        created_at: env.ledger().timestamp(),
        started_at: 0,
        completed_at: 0,
        creator,
        total_gas_used: 0,
        gas_budget: if gas_budget == 0 { config.default_gas_budget } else { gas_budget },
        checkpoint_id,
    };

    // Create initial checkpoint
    let checkpoint = StateCheckpoint {
        checkpoint_id: checkpoint_id.clone(),
        orchestration_id: orchestration_id.clone(),
        step_index: 0,
        contract_states: Map::new(env),
        timestamp: env.ledger().timestamp(),
    };
    storage::set_checkpoint(env, &checkpoint_id, &checkpoint);

    // Store orchestration
    storage::set_orchestration(env, &orchestration_id, &orchestration);

    // Emit event
    env.events().publish(
        (symbol_short!("orch_created"), orchestration_id.clone()),
        (orchestration_id.clone(), creator)
    );

    Ok(orchestration)
}

pub fn execute_orchestration(
    env: &Env,
    orchestration_id: String,
) -> Result<ExecutionResult, ContractError> {
    // Check reentrancy
    if storage::get_reentrancy_guard(env) {
        return Err(ContractError::ReentrancyDetected);
    }
    storage::set_reentrancy_guard(env, true);

    // Get orchestration
    let mut orchestration = storage::get_orchestration(env, &orchestration_id)?;

    // Validate state
    if orchestration.status != OrchestrationStatus::Created {
        storage::clear_reentrancy_guard(env);
        return Err(ContractError::InvalidOrchestrationState);
    }

    // Check timeout
    let current_time = env.ledger().timestamp();
    if current_time - orchestration.created_at > orchestration.timeout {
        orchestration.status = OrchestrationStatus::TimedOut;
        storage::set_orchestration(env, &orchestration_id, &orchestration);
        storage::clear_reentrancy_guard(env);
        return Ok(ExecutionResult {
            orchestration_id: orchestration_id.clone(),
            success: false,
            completed_steps: 0,
            total_steps: orchestration.steps.len() as u32,
            total_gas_used: orchestration.total_gas_used,
            error_message: String::from_str(env, "Orchestration timed out"),
        });
    }

    // Update status
    orchestration.status = OrchestrationStatus::Executing;
    orchestration.started_at = current_time;
    storage::set_orchestration(env, &orchestration_id, &orchestration);

    // Execute steps
    let mut completed_steps = 0u32;
    let mut error_message = String::from_str(env, "");
    let mut success = true;

    for i in 0..orchestration.steps.len() {
        let step_index = i as u32;
        let step_result = execute_step(env, &orchestration_id, step_index)?;

        orchestration.total_gas_used += step_result.gas_used;

        if !step_result.success {
            success = false;
            error_message = step_result.error_message;
            orchestration.status = OrchestrationStatus::StepFailed;
            storage::set_orchestration(env, &orchestration_id, &orchestration);
            
            // Initiate rollback
            let rollback_result = rollback_orchestration(env, orchestration_id.clone())?;
            
            storage::clear_reentrancy_guard(env);
            return Ok(ExecutionResult {
                orchestration_id: orchestration_id.clone(),
                success: false,
                completed_steps,
                total_steps: orchestration.steps.len() as u32,
                total_gas_used: orchestration.total_gas_used + rollback_result.total_gas_used,
                error_message: format!("Step failed: {}", error_message),
            });
        }

        completed_steps += 1;
        orchestration.current_step_index = step_index + 1;
        orchestration.status = OrchestrationStatus::StepCompleted;
        storage::set_orchestration(env, &orchestration_id, &orchestration);
    }

    // All steps completed
    orchestration.status = OrchestrationStatus::Completed;
    orchestration.completed_at = env.ledger().timestamp();
    storage::set_orchestration(env, &orchestration_id, &orchestration);

    // Emit completion event
    env.events().publish(
        (symbol_short!("orch_completed"), orchestration_id.clone()),
        (orchestration_id.clone(), completed_steps)
    );

    storage::clear_reentrancy_guard(env);

    Ok(ExecutionResult {
        orchestration_id: orchestration_id.clone(),
        success: true,
        completed_steps,
        total_steps: orchestration.steps.len() as u32,
        total_gas_used: orchestration.total_gas_used,
        error_message,
    })
}

pub fn execute_step(
    env: &Env,
    orchestration_id: &String,
    step_index: u32,
) -> Result<StepResult, ContractError> {
    let mut orchestration = storage::get_orchestration(env, orchestration_id)?;
    
    if step_index as usize >= orchestration.steps.len() {
        return Err(ContractError::InvalidStepConfig);
    }

    let step = &mut orchestration.steps[step_index as usize];
    
    // Update step status
    step.status = StepStatus::Executing;
    step.executed_at = env.ledger().timestamp();
    storage::set_orchestration(env, orchestration_id, &orchestration);

    // Create checkpoint before execution
    let checkpoint_id = format!("{}_step_{}", orchestration_id, step_index);
    let checkpoint = StateCheckpoint {
        checkpoint_id: checkpoint_id.clone(),
        orchestration_id: orchestration_id.clone(),
        step_index,
        contract_states: Map::new(env),
        timestamp: env.ledger().timestamp(),
    };
    storage::set_checkpoint(env, &checkpoint_id, &checkpoint);

    // In a real implementation, this would call the external contract
    // For now, we simulate successful execution
    let gas_used = step.gas_estimate;
    
    step.status = StepStatus::Completed;
    step.completed_at = env.ledger().timestamp();
    storage::set_orchestration(env, orchestration_id, &orchestration);

    // Emit step completion event
    env.events().publish(
        (symbol_short!("step_completed"), orchestration_id.clone()),
        (step.step_id.clone(), step_index)
    );

    Ok(StepResult {
        step_id: step.step_id.clone(),
        success: true,
        gas_used,
        error_message: String::from_str(env, ""),
    })
}

pub fn rollback_orchestration(
    env: &Env,
    orchestration_id: String,
) -> Result<RollbackResult, ContractError> {
    let mut orchestration = storage::get_orchestration(env, &orchestration_id)?;
    
    orchestration.status = OrchestrationStatus::RollingBack;
    storage::set_orchestration(env, &orchestration_id, &orchestration);

    // Emit rollback initiated event
    env.events().publish(
        (symbol_short!("rollback_initiated"), orchestration_id.clone()),
        orchestration_id.clone()
    );

    let mut rolled_back_steps = 0u32;
    let mut total_gas_used = 0u64;
    let mut error_message = String::from_str(env, "");

    // Rollback completed steps in reverse order
    for i in (0..orchestration.current_step_index as usize).rev() {
        let step = &orchestration.steps[i];
        
        if step.status == StepStatus::Completed {
            let rollback_result = rollback_step(env, &orchestration_id, i as u32)?;
            
            if !rollback_result.success {
                error_message = rollback_result.error_message;
                orchestration.status = OrchestrationStatus::StepFailed;
                storage::set_orchestration(env, &orchestration_id, &orchestration);
                
                return Ok(RollbackResult {
                    orchestration_id: orchestration_id.clone(),
                    success: false,
                    rolled_back_steps,
                    total_gas_used,
                    error_message,
                });
            }

            rolled_back_steps += 1;
            total_gas_used += rollback_result.gas_used;
        }
    }

    orchestration.status = OrchestrationStatus::RollbackCompleted;
    orchestration.completed_at = env.ledger().timestamp();
    storage::set_orchestration(env, &orchestration_id, &orchestration);

    // Emit rollback completed event
    env.events().publish(
        (symbol_short!("rollback_completed"), orchestration_id.clone()),
        (orchestration_id.clone(), rolled_back_steps)
    );

    Ok(RollbackResult {
        orchestration_id: orchestration_id.clone(),
        success: true,
        rolled_back_steps,
        total_gas_used,
        error_message,
    })
}

pub fn rollback_step(
    env: &Env,
    orchestration_id: &String,
    step_index: u32,
) -> Result<StepResult, ContractError> {
    let mut orchestration = storage::get_orchestration(env, orchestration_id)?;
    
    if step_index as usize >= orchestration.steps.len() {
        return Err(ContractError::InvalidStepConfig);
    }

    let step = &mut orchestration.steps[step_index as usize];
    
    // Update step status
    step.status = StepStatus::RollingBack;
    storage::set_orchestration(env, orchestration_id, &orchestration);

    // Restore checkpoint
    let checkpoint_id = format!("{}_step_{}", orchestration_id, step_index);
    if let Ok(_checkpoint) = storage::get_checkpoint(env, &checkpoint_id) {
        // In a real implementation, this would restore the state
        // For now, we simulate successful rollback
    }

    // In a real implementation, this would call the rollback function
    // For now, we simulate successful rollback
    let gas_used = step.gas_estimate / 2; // Rollback typically uses less gas
    
    step.status = StepStatus::RollbackCompleted;
    storage::set_orchestration(env, orchestration_id, &orchestration);

    // Remove checkpoint
    storage::remove_checkpoint(env, &checkpoint_id);

    Ok(StepResult {
        step_id: step.step_id.clone(),
        success: true,
        gas_used,
        error_message: String::from_str(env, ""),
    })
}

pub fn emergency_pause(env: &Env, admin: Address, paused: bool) -> Result<(), ContractError> {
    let mut config = storage::get_config(env);
    
    // Verify admin
    if config.admin_address != admin {
        return Err(ContractError::Unauthorized);
    }

    config.paused = paused;
    storage::set_config(env, &config);

    Ok(())
}

pub fn get_orchestration(env: &Env, orchestration_id: String) -> Result<Orchestration, ContractError> {
    storage::get_orchestration(env, &orchestration_id)
}

pub fn cancel_orchestration(env: &Env, orchestration_id: String, canceller: Address) -> Result<(), ContractError> {
    let mut orchestration = storage::get_orchestration(env, &orchestration_id)?;
    
    // Only creator can cancel
    if orchestration.creator != canceller {
        return Err(ContractError::Unauthorized);
    }

    // Can only cancel if not completed
    match orchestration.status {
        OrchestrationStatus::Completed | OrchestrationStatus::RollbackCompleted => {
            return Err(ContractError::InvalidOrchestrationState);
        }
        _ => {}
    }

    orchestration.status = OrchestrationStatus::Cancelled;
    orchestration.completed_at = env.ledger().timestamp();
    storage::set_orchestration(env, &orchestration_id, &orchestration);

    // Emit cancellation event
    env.events().publish(
        (symbol_short!("orch_cancelled"), orchestration_id.clone()),
        orchestration_id.clone()
    );

    Ok(())
}
