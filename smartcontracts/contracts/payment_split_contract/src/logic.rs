use soroban_sdk::{Env, Address, String, Vec, Symbol, symbol_short};
use crate::types::{
    PaymentSplit, Recipient, Milestone, SplitDistribution, SplitStatus, 
    SplitType, MilestoneStatus, ContractError, SplitConfig, RefundRequest, RefundStatus, SplitCheckpoint
};
use crate::storage::{get_split, set_split, get_distribution, set_distribution, get_config, has_split, get_security_config, get_refund_request, set_refund_request, get_reentrancy_guard, set_reentrancy_guard, clear_reentrancy_guard, get_split_checkpoint, set_split_checkpoint, remove_split_checkpoint};

pub fn validate_recipients(recipients: &Vec<Recipient>, split_type: &SplitType, config: &SplitConfig) -> Result<(), ContractError> {
    if recipients.len() == 0 {
        return Err(ContractError::InvalidRecipient);
    }

    if recipients.len() as u32 > config.max_recipients {
        return Err(ContractError::InvalidRecipient);
    }

    match split_type {
        SplitType::Percentage => {
            let mut total_percentage: i128 = 0;
            for recipient in recipients.iter() {
                if recipient.percentage < config.min_split_percentage || 
                   recipient.percentage > config.max_split_percentage {
                    return Err(ContractError::InvalidPercentage);
                }
                total_percentage = total_percentage.checked_add(recipient.percentage).ok_or(ContractError::Overflow)?;
            }
            if total_percentage != 100 {
                return Err(ContractError::InvalidPercentage);
            }
        }
        SplitType::FixedAmount => {
            let mut _total_fixed: i128 = 0;
            for recipient in recipients.iter() {
                if recipient.fixed_amount <= 0 {
                    return Err(ContractError::InvalidAmount);
                }
                _total_fixed = _total_fixed.checked_add(recipient.fixed_amount).ok_or(ContractError::Overflow)?;
            }
        }
        SplitType::Milestone => {
            // Milestone splits are validated differently
            for recipient in recipients.iter() {
                if recipient.percentage < config.min_split_percentage || 
                   recipient.percentage > config.max_split_percentage {
                    return Err(ContractError::InvalidPercentage);
                }
            }
        }
        SplitType::Hybrid => {
            // Hybrid splits combine percentage and fixed amounts
            // Validate that percentages sum to <= 100 and fixed amounts are positive
            let mut total_percentage: i128 = 0;
            let mut _total_fixed: i128 = 0;
            
            for recipient in recipients.iter() {
                // Each recipient can have either percentage or fixed amount (or both)
                if recipient.percentage > 0 {
                    if recipient.percentage < config.min_split_percentage || 
                       recipient.percentage > config.max_split_percentage {
                        return Err(ContractError::InvalidPercentage);
                    }
                    total_percentage = total_percentage.checked_add(recipient.percentage).ok_or(ContractError::Overflow)?;
                }
                
                if recipient.fixed_amount > 0 {
                    if recipient.fixed_amount <= 0 {
                        return Err(ContractError::InvalidAmount);
                    }
                    _total_fixed = _total_fixed.checked_add(recipient.fixed_amount).ok_or(ContractError::Overflow)?;
                }
                
                // At least one of percentage or fixed amount must be set
                if recipient.percentage == 0 && recipient.fixed_amount == 0 {
                    return Err(ContractError::InvalidAmount);
                }
            }
            
            // Total percentage must not exceed 100
            if total_percentage > 100 {
                return Err(ContractError::InvalidPercentage);
            }
        }
        _ => {
            // Conditional, TimeLocked, Recursive splits use percentage validation
            let mut total_percentage: i128 = 0;
            for recipient in recipients.iter() {
                if recipient.percentage < config.min_split_percentage || 
                   recipient.percentage > config.max_split_percentage {
                    return Err(ContractError::InvalidPercentage);
                }
                total_percentage = total_percentage.checked_add(recipient.percentage).ok_or(ContractError::Overflow)?;
            }
            if total_percentage != 100 {
                return Err(ContractError::InvalidPercentage);
            }
        }
    }

    Ok(())
}

/// Calculate distribution amount for a recipient in a hybrid split
pub fn calculate_hybrid_amount(
    recipient: &Recipient,
    total_amount: i128,
) -> Result<i128, ContractError> {
    let mut amount: i128 = 0;
    
    // Add percentage-based amount with overflow protection
    if recipient.percentage > 0 {
        let percentage_amount = total_amount
            .checked_mul(recipient.percentage)
            .ok_or(ContractError::Overflow)?
            .checked_div(100)
            .ok_or(ContractError::Underflow)?;
        amount = amount.checked_add(percentage_amount).ok_or(ContractError::Overflow)?;
    }
    
    // Add fixed amount with overflow protection
    if recipient.fixed_amount > 0 {
        amount = amount.checked_add(recipient.fixed_amount).ok_or(ContractError::Overflow)?;
    }
    
    Ok(amount)
}

/// Validate recursive split structure and detect circular references
pub fn validate_recursive_structure(
    env: &Env,
    current_split_id: &String,
    visited_splits: &mut Vec<String>,
    current_depth: u32,
) -> Result<(), ContractError> {
    let security_config = get_security_config(env);
    
    // Check depth limit
    if current_depth >= security_config.max_recursive_depth {
        return Err(ContractError::MaxDepthExceeded);
    }
    
    // Check for circular reference
    for i in 0..visited_splits.len() {
        let visited = visited_splits.get(i).unwrap();
        if visited.clone() == current_split_id.clone() {
            return Err(ContractError::CircularReference);
        }
    }
    
    // Add current split to visited list
    visited_splits.push_back(current_split_id.clone());
    
    // Get the split and check its recipients for recursive splits
    if let Ok(split) = get_split(env, current_split_id) {
        for i in 0..split.recipients.len() {
            let recipient = split.recipients.get(i).unwrap();
            if recipient.is_recursive {
                validate_recursive_structure(
                    env,
                    &recipient.recursive_split_id,
                    visited_splits,
                    current_depth + 1,
                )?;
            }
        }
    }
    
    // Note: Soroban Vec doesn't have pop, so we don't remove from visited list
    // This means we track all visited splits in the current path, which is fine
    // for circular reference detection
    
    Ok(())
}

/// Check if a conditional split's conditions are met
pub fn check_condition_met(env: &Env, split: &PaymentSplit) -> Result<bool, ContractError> {
    let current_time = env.ledger().timestamp();
    
    // Check if condition has expired
    if split.conditional_split.expires_at > 0 && current_time > split.conditional_split.expires_at {
        return Err(ContractError::ConditionExpired);
    }
    
    // In a real implementation, this would check external conditions
    // For now, we check if the condition has been met
    Ok(split.conditional_split.status == crate::types::ConditionalStatus::ConditionMet)
}

/// Verify a conditional split's condition
pub fn verify_condition(
    env: &Env,
    split_id: String,
    verifier: Address,
) -> Result<PaymentSplit, ContractError> {
    let mut split = get_split(env, &split_id)?;
    
    // Only merchant can verify conditions (in production, add proper auth)
    if split.merchant_address != verifier {
        return Err(ContractError::Unauthorized);
    }
    
    let current_time = env.ledger().timestamp();
    
    // Check if condition has expired
    if split.conditional_split.expires_at > 0 && current_time > split.conditional_split.expires_at {
        return Err(ContractError::ConditionExpired);
    }
    
    // Mark condition as met
    split.conditional_split.status = crate::types::ConditionalStatus::ConditionMet;
    split.conditional_split.verified_at = current_time;
    
    set_split(env, &split_id, &split);
    Ok(split)
}

/// Check if a time-locked split can be released
pub fn check_time_lock_released(env: &Env, split: &PaymentSplit) -> Result<bool, ContractError> {
    let current_time = env.ledger().timestamp();
    
    if split.time_locked_split.lock_until == 0 {
        // No time lock set
        return Ok(true);
    }
    
    if current_time < split.time_locked_split.lock_until {
        return Err(ContractError::TimeLockNotExpired);
    }
    
    Ok(true)
}

/// Release a time-locked split
pub fn release_time_lock(
    env: &Env,
    split_id: String,
    releaser: Address,
) -> Result<PaymentSplit, ContractError> {
    let mut split = get_split(env, &split_id)?;
    
    // Only merchant can release time locks (in production, add proper auth)
    if split.merchant_address != releaser {
        return Err(ContractError::Unauthorized);
    }
    
    let current_time = env.ledger().timestamp();
    
    // Check if time lock has expired
    if current_time < split.time_locked_split.lock_until {
        return Err(ContractError::TimeLockNotExpired);
    }
    
    // Mark as released
    split.time_locked_split.released_at = current_time;
    
    set_split(env, &split_id, &split);
    Ok(split)
}

pub fn create_split(
    env: &Env,
    split_id: String,
    payment_id: String,
    merchant_address: Address,
    total_amount: i128,
    currency: Address,
    split_type: SplitType,
    recipients: Vec<Recipient>,
    milestones: Vec<Milestone>,
) -> Result<PaymentSplit, ContractError> {
    if has_split(env, &split_id) {
        return Err(ContractError::SplitAlreadyExecuted);
    }

    let config = get_config(env);
    validate_recipients(&recipients, &split_type, &config)?;

    // Validate recursive structure if this is a recursive split
    if split_type == SplitType::Recursive {
        let mut visited_splits = Vec::new(env);
        validate_recursive_structure(env, &split_id, &mut visited_splits, 0)?;
    }

    let split = PaymentSplit {
        split_id: split_id.clone(),
        payment_id,
        merchant_address,
        total_amount,
        currency,
        split_type,
        status: SplitStatus::Pending,
        recipients,
        milestones,
        conditional_split: crate::types::ConditionalSplit {
            condition_id: String::from_str(env, ""),
            condition_type: String::from_str(env, ""),
            condition_data: soroban_sdk::Map::new(env),
            status: crate::types::ConditionalStatus::Pending,
            expires_at: 0,
            verified_at: 0,
        },
        time_locked_split: crate::types::TimeLockedSplit {
            lock_until: 0,
            release_automatically: false,
            released_at: 0,
        },
        recursive_config: crate::types::RecursiveSplitConfig {
            parent_split_id: String::from_str(env, ""),
            current_depth: 0,
            max_depth: 5,
            visited_splits: Vec::new(env),
        },
        created_at: env.ledger().timestamp(),
        executed_at: 0,
        completed_at: 0,
        retry_count: 0,
        max_retries: config.max_retries,
        refund_status: crate::types::RefundStatus::None,
        refunded_amount: 0,
        refund_fee: 0,
    };

    set_split(env, &split_id, &split);
    Ok(split)
}

pub fn execute_split(env: &Env, split_id: String, executor: Address) -> Result<PaymentSplit, ContractError> {
    let mut split = get_split(env, &split_id)?;

    if split.status != SplitStatus::Pending {
        return Err(ContractError::SplitAlreadyExecuted);
    }

    if split.merchant_address != executor && get_config(env).require_merchant_approval {
        return Err(ContractError::Unauthorized);
    }

    split.status = SplitStatus::Executing;
    split.executed_at = env.ledger().timestamp();
    set_split(env, &split_id, &split);

    Ok(split)
}

pub fn distribute_to_recipient(
    env: &Env,
    split_id: String,
    recipient_address: Address,
    amount: i128,
    distribution_id: String,
) -> Result<SplitDistribution, ContractError> {
    let split = get_split(env, &split_id)?;

    if split.status != SplitStatus::Executing {
        return Err(ContractError::SplitAlreadyExecuted);
    }

    let distribution = SplitDistribution {
        distribution_id: distribution_id.clone(),
        split_id: split_id.clone(),
        recipient_address,
        amount,
        transaction_hash: symbol_short!("PENDING"),
        status: SplitStatus::Executing,
        attempted_at: env.ledger().timestamp(),
        completed_at: 0,
        error_message: String::from_str(env, ""),
        is_recursive: false,
        parent_distribution_id: String::from_str(env, ""),
    };

    set_distribution(env, &distribution_id, &distribution);
    Ok(distribution)
}

pub fn confirm_distribution(
    env: &Env,
    distribution_id: String,
    transaction_hash: Symbol,
) -> Result<SplitDistribution, ContractError> {
    let mut distribution = get_distribution(env, &distribution_id)?;
    
    distribution.status = SplitStatus::Completed;
    distribution.transaction_hash = transaction_hash;
    distribution.completed_at = env.ledger().timestamp();
    
    set_distribution(env, &distribution_id, &distribution);
    
    // Update split status if all distributions are complete
    update_split_completion_status(env, &distribution.split_id);
    
    Ok(distribution)
}

pub fn fail_distribution(
    env: &Env,
    distribution_id: String,
    error_message: String,
) -> Result<SplitDistribution, ContractError> {
    let mut distribution = get_distribution(env, &distribution_id)?;
    
    distribution.status = SplitStatus::Failed;
    distribution.error_message = error_message;
    
    set_distribution(env, &distribution_id, &distribution);
    
    // Update split status and retry count
    let mut split = get_split(env, &distribution.split_id)?;
    split.retry_count += 1;
    
    if split.retry_count >= split.max_retries {
        split.status = SplitStatus::Failed;
    } else {
        split.status = SplitStatus::PartiallyCompleted;
    }
    
    set_split(env, &distribution.split_id, &split);
    
    Ok(distribution)
}

pub fn update_split_completion_status(env: &Env, split_id: &String) {
    if let Ok(mut split) = get_split(env, split_id) {
        let mut all_completed = true;
        let mut any_failed = false;
        
        for i in 0..split.recipients.len() {
            let recipient = split.recipients.get(i).unwrap();
            if recipient.distribution_status != SplitStatus::Completed {
                all_completed = false;
            }
            if recipient.distribution_status == SplitStatus::Failed {
                any_failed = true;
            }
        }
        
        if all_completed {
            split.status = SplitStatus::Completed;
            split.completed_at = env.ledger().timestamp();
        } else if any_failed {
            split.status = SplitStatus::PartiallyCompleted;
        }
        
        set_split(env, split_id, &split);
    }
}

pub fn trigger_milestone(
    env: &Env,
    split_id: String,
    milestone_id: String,
    triggerer: Address,
) -> Result<Milestone, ContractError> {
    let mut split = get_split(env, &split_id)?;
    
    if split.merchant_address != triggerer {
        return Err(ContractError::Unauthorized);
    }
    
    let mut milestone_found = false;
    let mut updated_milestone = Milestone {
        milestone_id: String::from_str(env, ""),
        description: String::from_str(env, ""),
        trigger_condition: String::from_str(env, ""),
        required_amount: 0,
        status: MilestoneStatus::Pending,
        triggered_at: 0,
        completed_at: 0,
    };
    
    // Find and update the milestone
    let mut new_milestones = Vec::new(env);
    for i in 0..split.milestones.len() {
        let milestone = split.milestones.get(i).unwrap();
        if milestone.milestone_id == milestone_id {
            if milestone.status != MilestoneStatus::Pending {
                return Err(ContractError::MilestoneNotTriggered);
            }
            updated_milestone = Milestone {
                milestone_id: milestone.milestone_id.clone(),
                description: milestone.description.clone(),
                trigger_condition: milestone.trigger_condition.clone(),
                required_amount: milestone.required_amount,
                status: MilestoneStatus::Triggered,
                triggered_at: env.ledger().timestamp(),
                completed_at: milestone.completed_at,
            };
            new_milestones.push_back(updated_milestone.clone());
            milestone_found = true;
        } else {
            new_milestones.push_back(milestone.clone());
        }
    }
    
    if !milestone_found {
        return Err(ContractError::MilestoneNotTriggered);
    }
    
    split.milestones = new_milestones;
    set_split(env, &split_id, &split);
    
    Ok(updated_milestone)
}

pub fn complete_milestone(
    env: &Env,
    split_id: String,
    milestone_id: String,
    completer: Address,
) -> Result<Milestone, ContractError> {
    let mut split = get_split(env, &split_id)?;
    
    if split.merchant_address != completer {
        return Err(ContractError::Unauthorized);
    }
    
    let mut milestone_found = false;
    let mut updated_milestone = Milestone {
        milestone_id: String::from_str(env, ""),
        description: String::from_str(env, ""),
        trigger_condition: String::from_str(env, ""),
        required_amount: 0,
        status: MilestoneStatus::Pending,
        triggered_at: 0,
        completed_at: 0,
    };
    
    // Find and update the milestone
    let mut new_milestones = Vec::new(env);
    for i in 0..split.milestones.len() {
        let milestone = split.milestones.get(i).unwrap();
        if milestone.milestone_id == milestone_id {
            if milestone.status != MilestoneStatus::Triggered {
                return Err(ContractError::MilestoneNotTriggered);
            }
            updated_milestone = Milestone {
                milestone_id: milestone.milestone_id.clone(),
                description: milestone.description.clone(),
                trigger_condition: milestone.trigger_condition.clone(),
                required_amount: milestone.required_amount,
                status: MilestoneStatus::Completed,
                triggered_at: milestone.triggered_at,
                completed_at: env.ledger().timestamp(),
            };
            new_milestones.push_back(updated_milestone.clone());
            milestone_found = true;
        } else {
            new_milestones.push_back(milestone.clone());
        }
    }
    
    if !milestone_found {
        return Err(ContractError::MilestoneNotTriggered);
    }
    
    split.milestones = new_milestones.clone();
    
    // Check if all milestones are completed
    let mut all_completed = true;
    for i in 0..new_milestones.len() {
        let m = new_milestones.get(i).unwrap();
        if m.status != MilestoneStatus::Completed {
            all_completed = false;
            break;
        }
    }
    
    if all_completed {
        split.status = SplitStatus::Completed;
        split.completed_at = env.ledger().timestamp();
    }
    
    set_split(env, &split_id, &split);
    
    Ok(updated_milestone)
}

pub fn cancel_split(env: &Env, split_id: String, canceller: Address) -> Result<PaymentSplit, ContractError> {
    let mut split = get_split(env, &split_id)?;
    
    if split.merchant_address != canceller {
        return Err(ContractError::Unauthorized);
    }
    
    if split.status == SplitStatus::Completed || split.status == SplitStatus::Executing {
        return Err(ContractError::SplitAlreadyExecuted);
    }
    
    split.status = SplitStatus::Cancelled;
    set_split(env, &split_id, &split);
    
    Ok(split)
}

pub fn retry_failed_distributions(env: &Env, split_id: String, retryer: Address) -> Result<PaymentSplit, ContractError> {
    let mut split = get_split(env, &split_id)?;
    
    if split.merchant_address != retryer {
        return Err(ContractError::Unauthorized);
    }
    
    if split.retry_count >= split.max_retries {
        return Err(ContractError::MaxRetriesExceeded);
    }
    
    split.retry_count += 1;
    split.status = SplitStatus::Executing;
    
    // Reset failed recipients to pending
    let mut new_recipients = Vec::new(env);
    for i in 0..split.recipients.len() {
        let recipient = split.recipients.get(i).unwrap();
        let mut updated_recipient = recipient.clone();
        if recipient.distribution_status == SplitStatus::Failed {
            updated_recipient.distribution_status = SplitStatus::Pending;
        }
        new_recipients.push_back(updated_recipient);
    }
    split.recipients = new_recipients;
    
    set_split(env, &split_id, &split);
    Ok(split)
}

pub fn reject_refund(env: &Env, refund_id: String, admin: Address) -> Result<RefundRequest, ContractError> {
    let config = get_security_config(env);
    if config.admin_address != admin {
        return Err(ContractError::Unauthorized);
    }

    let mut refund = get_refund_request(env, &refund_id)?;
    if refund.status != RefundStatus::Requested {
        return Err(ContractError::InvalidRefundAmount);
    }

    refund.status = RefundStatus::Rejected;
    set_refund_request(env, &refund_id, &refund);

    Ok(refund)
}

/// Request a refund for a split
pub fn request_refund(
    env: &Env,
    refund_id: String,
    split_id: String,
    requester: Address,
    refund_amount: i128,
    reason: String,
) -> Result<RefundRequest, ContractError> {
    let split = get_split(env, &split_id)?;
    let security_config = get_security_config(env);
    
    // Check if refund is allowed
    if split.status == SplitStatus::Completed {
        return Err(ContractError::RefundNotAllowed);
    }
    
    // Only merchant or original payer can request refund
    if split.merchant_address != requester {
        return Err(ContractError::Unauthorized);
    }
    
    // Calculate refund fee with overflow protection
    let fee_amount = refund_amount
        .checked_mul(security_config.refund_fee_percentage)
        .ok_or(ContractError::Overflow)?
        .checked_div(100)
        .ok_or(ContractError::Underflow)?;
    let net_refund = refund_amount.checked_sub(fee_amount).ok_or(ContractError::Underflow)?;
    
    // Validate refund amount
    if net_refund <= 0 || refund_amount > split.total_amount {
        return Err(ContractError::InvalidRefundAmount);
    }
    
    let refund_request = RefundRequest {
        refund_id: refund_id.clone(),
        split_id: split_id.clone(),
        requester,
        refund_amount: net_refund,
        reason,
        status: RefundStatus::Requested,
        requested_at: env.ledger().timestamp(),
        approved_at: 0,
        completed_at: 0,
        fee_amount,
        admin_address: security_config.admin_address,
    };
    
    set_refund_request(env, &refund_id, &refund_request);
    Ok(refund_request)
}

/// Approve a refund request (admin only)
pub fn approve_refund(
    env: &Env,
    refund_id: String,
    admin: Address,
) -> Result<RefundRequest, ContractError> {
    let security_config = get_security_config(env);
    
    // Verify admin
    if security_config.admin_address != admin {
        return Err(ContractError::AdminOnly);
    }
    
    let mut refund_request = get_refund_request(env, &refund_id)?;
    
    // Check if already processed
    if refund_request.status != RefundStatus::Requested {
        return Err(ContractError::RefundAlreadyProcessed);
    }
    
    // Mark as approved
    refund_request.status = RefundStatus::Approved;
    refund_request.approved_at = env.ledger().timestamp();
    
    set_refund_request(env, &refund_id, &refund_request);
    
    // Update split refund status
    let mut split = get_split(env, &refund_request.split_id)?;
    split.refund_status = RefundStatus::Approved;
    split.refunded_amount = refund_request.refund_amount;
    split.refund_fee = refund_request.fee_amount;
    set_split(env, &refund_request.split_id, &split);
    
    Ok(refund_request)
}

/// Complete a refund (after funds have been transferred)
pub fn complete_refund(
    env: &Env,
    refund_id: String,
) -> Result<RefundRequest, ContractError> {
    let mut refund_request = get_refund_request(env, &refund_id)?;
    
    // Check if approved
    if refund_request.status != RefundStatus::Approved {
        return Err(ContractError::RefundNotAllowed);
    }
    
    // Mark as completed
    refund_request.status = RefundStatus::Completed;
    refund_request.completed_at = env.ledger().timestamp();
    
    set_refund_request(env, &refund_id, &refund_request);
    
    // Update split status
    let mut split = get_split(env, &refund_request.split_id)?;
    split.refund_status = RefundStatus::Completed;
    split.status = SplitStatus::Refunded;
    set_split(env, &refund_request.split_id, &split);

    Ok(split)
}

pub fn execute_split_atomic(
    env: &Env,
    split_id: String,
    executor: Address,
    orchestration_id: String,
) -> Result<PaymentSplit, ContractError> {
    let mut split = get_split(env, &split_id)?;

    // Verify orchestration ID matches
    if split.orchestration_id != Some(orchestration_id.clone()) {
        return Err(ContractError::OrchestrationMismatch);
    }

    // Check reentrancy
    if get_reentrancy_guard(env) {
        return Err(ContractError::ReentrancyDetected);
    }
    set_reentrancy_guard(env, true);

    // Validate state
    if split.status != SplitStatus::Pending {
        clear_reentrancy_guard(env);
        return Err(ContractError::InvalidSplitState);
    }

    // Create checkpoint before execution
    let checkpoint_id = format!("{}_execute", orchestration_id);
    let checkpoint = SplitCheckpoint {
        checkpoint_id: checkpoint_id.clone(),
        orchestration_id: orchestration_id.clone(),
        split_id: split_id.clone(),
        previous_status: split.status.clone(),
        distributed_amounts: Vec::new(env),
        timestamp: env.ledger().timestamp(),
    };
    set_split_checkpoint(env, &checkpoint_id, &checkpoint);

    // Update status
    split.status = SplitStatus::Executing;
    split.executed_at = env.ledger().timestamp();
    set_split(env, &split_id, &split);

    clear_reentrancy_guard(env);

    // Emit event
    env.events().publish(
        (symbol_short!("split_executed_atomic"), split_id.clone()),
        (split_id.clone(), orchestration_id.clone())
    );

    Ok(split)
}

pub fn rollback_split(
    env: &Env,
    split_id: String,
    orchestration_id: String,
) -> Result<PaymentSplit, ContractError> {
    let mut split = get_split(env, &split_id)?;

    // Verify orchestration ID matches
    if split.orchestration_id != Some(orchestration_id.clone()) {
        return Err(ContractError::OrchestrationMismatch);
    }

    // Check reentrancy
    if get_reentrancy_guard(env) {
        return Err(ContractError::ReentrancyDetected);
    }
    set_reentrancy_guard(env, true);

    // Restore from checkpoint
    let checkpoint_id = format!("{}_execute", orchestration_id);
    if let Ok(checkpoint) = get_split_checkpoint(env, &checkpoint_id) {
        split.status = checkpoint.previous_status;
        split.executed_at = 0;
    } else {
        // If no checkpoint, just revert to Pending
        split.status = SplitStatus::Pending;
        split.executed_at = 0;
    }

    set_split(env, &split_id, &split);

    // Clear checkpoint
    remove_split_checkpoint(env, &checkpoint_id);

    clear_reentrancy_guard(env);

    // Emit rollback event
    env.events().publish(
        (symbol_short!("split_rolled_back"), split_id.clone()),
        (split_id.clone(), orchestration_id.clone())
    );

    Ok(split)
}

pub fn get_state_checkpoint(env: &Env, checkpoint_id: String) -> Result<SplitCheckpoint, ContractError> {
    get_split_checkpoint(env, &checkpoint_id)
}

/// Set reentrancy guard (call before sensitive operations)
pub fn set_reentrancy_protection(env: &Env) -> Result<(), ContractError> {
    if get_reentrancy_guard(env) {
        return Err(ContractError::ReentrancyDetected);
    }
    set_reentrancy_guard(env, true);
    Ok(())
}

/// Clear reentrancy guard (call after sensitive operations)
pub fn clear_reentrancy_protection(env: &Env) {
    clear_reentrancy_guard(env);
}

/// Pause the contract (admin only)
pub fn pause_contract(env: &Env, admin: Address) -> Result<(), ContractError> {
    let mut security_config = get_security_config(env);
    
    // Verify admin
    if security_config.admin_address != admin {
        return Err(ContractError::AdminOnly);
    }
    
    security_config.paused = true;
    crate::storage::set_security_config(env, &security_config);
    Ok(())
}

/// Unpause the contract (admin only)
pub fn unpause_contract(env: &Env, admin: Address) -> Result<(), ContractError> {
    let mut security_config = get_security_config(env);
    
    // Verify admin
    if security_config.admin_address != admin {
        return Err(ContractError::AdminOnly);
    }
    
    security_config.paused = false;
    crate::storage::set_security_config(env, &security_config);
    Ok(())
}

/// Check if contract is paused
pub fn is_contract_paused(env: &Env) -> bool {
    let security_config = get_security_config(env);
    security_config.paused
}
