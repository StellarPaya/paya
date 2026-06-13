use soroban_sdk::{contracttype, contracterror};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Version,
    Admin,
    ExchangeRate(Symbol), // Lưu trữ tỷ giá theo cặp tiền
    Payment(String),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    PaymentAlreadyExists = 1,
    Unauthorized = 2,
    PaymentNotFound = 3,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Currency {
    BTC,
    USDC,
    ETH,
    VND, // Hỗ trợ thêm cả VNĐ cho Sếp
}

use soroban_sdk::{Address, String, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PaymentStatus {
    Pending,
    Confirmed,
    Failed,
    Expired,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentRecord {
    pub payment_id: String,
    pub merchant_address: Address,
    pub amount: i128,
    pub asset: Address,
    pub status: PaymentStatus,
    pub timestamp: u64,
}
