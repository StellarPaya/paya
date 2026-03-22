use soroban_sdk::contracttype;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Version,
    Admin,
    ExchangeRate(Symbol), // Lưu trữ tỷ giá theo cặp tiền
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Currency {
    BTC,
    USDC,
    ETH,
    VND, // Hỗ trợ thêm cả VNĐ cho Sếp
}

use soroban_sdk::Symbol;
