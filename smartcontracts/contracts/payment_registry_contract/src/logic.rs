use soroban_sdk::{Env, Symbol, Address, BytesN, String, xdr::ToXdr, symbol_short};
use crate::storage;
use crate::types::{Error, PaymentRecord, PaymentStatus};

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

fn bytes_to_hex(env: &Env, bytes: BytesN<32>) -> String {
    let hex_chars = b"0123456789abcdef";
    let mut hex_bytes = [0u8; 64];
    for (i, &b) in bytes.to_array().iter().enumerate() {
        hex_bytes[i * 2] = hex_chars[(b >> 4) as usize];
        hex_bytes[i * 2 + 1] = hex_chars[(b & 0x0F) as usize];
    }
    String::from_str(env, core::str::from_utf8(&hex_bytes).unwrap())
}

pub fn create_payment_record(
    env: &Env,
    merchant_address: Address,
    amount: i128,
    asset: Address,
) -> Result<String, Error> {
    let timestamp = env.ledger().timestamp();
    
    // Create deterministic ID payload
    let tuple = (merchant_address.clone(), amount, asset.clone(), timestamp);
    let id_hash = env.crypto().sha256(&tuple.to_xdr(env));
    
    let payment_id = bytes_to_hex(env, id_hash);
    
    if storage::payment_exists(env, payment_id.clone()) {
        return Err(Error::PaymentAlreadyExists);
    }
    
    let record = PaymentRecord {
        payment_id: payment_id.clone(),
        merchant_address,
        amount,
        asset,
        status: PaymentStatus::Pending,
        timestamp,
    };
    
    storage::save_payment(env, payment_id.clone(), record.clone());
    
    env.events().publish((symbol_short!("created"), payment_id.clone()), record);
    
    Ok(payment_id)
}
