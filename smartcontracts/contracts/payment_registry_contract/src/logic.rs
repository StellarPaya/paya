use soroban_sdk::{Env, Symbol};
use crate::storage;

pub fn ensure_initialized(env: &Env) {
    if storage::get_version(env) == 0 {
        storage::set_version(env, 1);
    }
}

pub fn convert_btc_to_usdc(_env: &Env, btc_amount: i128) -> i128 {
    // [NÂNG CẤP V102.5] Hiện thực hóa luồng BTC -> USDC (Issue #38).
    // Sử dụng tỷ giá Oracle giả lập cho Milestone 1.
    // Tỷ giá BTC/USDC hiện tại (Ví dụ: 65,000 USD)
    let btc_price_usdc: i128 = 65000; 
    
    // Tính toán số lượng USDC
    let usdc_amount = btc_amount * btc_price_usdc;
    
    usdc_amount
}
