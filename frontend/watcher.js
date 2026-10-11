// Stellar blockchain watcher for Paya
// Monitors deposit addresses for incoming payments and updates payment status
// Run with: node frontend/watcher.js
//
// SECURITY WARNING: This watcher is for MVP/demo purposes only.
// For production, use proper on-chain verification via payment_registry_contract.

import fs from 'fs'
import path from 'path'
import { Server, TransactionBuilder, Networks, Asset, Operation, Account, BASE_FEE } from 'stellar-sdk'

const DATA_FILE = path.resolve(process.cwd(), 'frontend/data/payments.json')

// Configuration
const HORIZON_URL = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org'
const NETWORK_PASSPHRASE = process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015'

// USDC issuer addresses (must match the network)
const USDC_ISSUERS = {
  'Test SDF Network ; September 2015': 'GBBD47IF6LWK7P7TDEVARSZ3R3NE7K6T4UX4LJTKQN4K7MXFLR7WU4AB2',
  'Public Global Stellar Network ; September 2015': 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGFX3OBWEYEWLMXXAL2JG2'
}

// Get the correct USDC issuer for the current network
const USDC_ISSUER = USDC_ISSUERS[NETWORK_PASSPHRASE]

// Feature flag for manual fallback (DEMO ONLY - set to false in production)
const ENABLE_MANUAL_FALLBACK = process.env.ENABLE_MANUAL_FALLBACK === 'true' || false

// Initialize Stellar server
const server = new Server(HORIZON_URL)

// Cache for last cursor to avoid reprocessing
let lastCursor = 'now'

async function checkPayments() {
  if (!fs.existsSync(DATA_FILE)) {
    console.log('No payments file found, skipping check')
    return
  }

  const payments = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  const pendingPayments = payments.filter(p => p.status === 'PENDING')

  if (pendingPayments.length === 0) {
    console.log('No pending payments to check')
    return
  }

  console.log(`Checking ${pendingPayments.length} pending payments...`)

  // Group payments by deposit address
  const addressMap = new Map()
  for (const payment of pendingPayments) {
    if (!addressMap.has(payment.depositAddress)) {
      addressMap.set(payment.depositAddress, [])
    }
    addressMap.get(payment.depositAddress).push(payment)
  }

  // Check each deposit address for transactions
  for (const [depositAddress, addressPayments] of addressMap) {
    try {
      await checkAddressTransactions(depositAddress, addressPayments, payments)
    } catch (error) {
      console.error(`Error checking address ${depositAddress}:`, error.message)
    }
  }

  // Save updated payments
  fs.writeFileSync(DATA_FILE, JSON.stringify(payments, null, 2))
}

async function checkAddressTransactions(depositAddress, addressPayments, allPayments) {
  console.log(`Checking transactions for address: ${depositAddress}`)

  // Get transactions for this address
  const transactions = await server
    .transactions()
    .forAccount(depositAddress)
    .order('desc')
    .limit(100)
    .call()

  for (const tx of transactions.records) {
    // Skip if we've already processed this transaction
    if (tx.memo && tx.memo === lastCursor) {
      continue
    }

    // Get transaction operations to find payment details
    const ops = await server.operations().forTransaction(tx.id).call()

    for (const op of ops.records) {
      // Verify it's a payment operation
      if (op.type !== 'payment') continue

      // Verify it's USDC (check both asset code and issuer)
      const isUSDC = op.asset_type === 'credit_alphanum4' && 
                     op.asset_code === 'USDC' && 
                     op.asset_issuer === USDC_ISSUER

      if (!isUSDC) {
        console.log(`⚠ Skipping non-USDC payment: ${op.asset_code} from issuer ${op.asset_issuer}`)
        continue
      }

      // Check if this payment matches any pending payment by memo
      const memo = tx.memo ? tx.memo.toString() : null
      
      if (!memo) {
        console.log(`⚠ Transaction ${tx.id} has no memo, skipping`)
        continue
      }

      const matchingPayment = addressPayments.find(p => p.memo === memo)
      
      if (matchingPayment) {
        // Verify amount matches exactly (no tolerance for security)
        const txAmount = parseFloat(op.amount)
        const expectedAmount = parseFloat(matchingPayment.amount)
        
        // Use exact matching for security - no tolerance
        if (txAmount === expectedAmount) {
          // Update payment status
          const paymentIndex = allPayments.findIndex(p => p.id === matchingPayment.id)
          if (paymentIndex !== -1) {
            console.log(`✓ Payment ${matchingPayment.id} confirmed! Amount: ${op.amount} USDC`)
            allPayments[paymentIndex].status = 'PAID'
            allPayments[paymentIndex].txHash = tx.hash
            allPayments[paymentIndex].updatedAt = Date.now()
          }
        } else {
          console.log(`⚠ Payment ${matchingPayment.id} found but amount mismatch: expected ${expectedAmount}, got ${txAmount}`)
        }
      }
    }
  }
}

// Alternative: Manual mark as paid for demo/testing ONLY
// SECURITY WARNING: This bypasses blockchain verification and should NEVER be used in production
async function checkManualMark() {
  if (!ENABLE_MANUAL_FALLBACK) {
    console.log('Manual fallback is disabled. Set ENABLE_MANUAL_FALLBACK=true to enable (DEMO ONLY).')
    return
  }

  if (!fs.existsSync(DATA_FILE)) return
  
  const payments = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  let updated = false

  for (const p of payments) {
    if (p.status === 'PENDING' && p.manualMarkPaid === true) {
      console.warn(`⚠ DEMO MODE: Manually marking payment ${p.id} as PAID without blockchain verification`)
      console.warn(`⚠ This should NEVER be used in production!`)
      p.status = 'PAID'
      p.txHash = 'DEMO_MANUAL_TX_' + Date.now()
      p.updatedAt = Date.now()
      delete p.manualMarkPaid
      updated = true
    }
  }

  if (updated) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(payments, null, 2))
  }
}

// Main check function
async function check() {
  try {
    // Try real blockchain monitoring first
    await checkPayments()
  } catch (error) {
    console.error('Error in blockchain monitoring:', error.message)
    
    // Only use manual fallback if explicitly enabled (DEMO ONLY)
    if (ENABLE_MANUAL_FALLBACK) {
      console.warn('⚠ Falling back to manual mark check (DEMO MODE ONLY)')
      console.warn('⚠ This bypasses blockchain verification and should NEVER be used in production!')
      await checkManualMark()
    } else {
      console.error('Blockchain monitoring failed and manual fallback is disabled.')
      console.error('Payments will not be processed. Please check the Horizon connection.')
    }
  }
}

// Start the watcher
console.log('Starting Paya blockchain watcher...')
console.log(`Horizon URL: ${HORIZON_URL}`)
console.log(`Checking payments every 10 seconds...`)

check()
setInterval(check, 10000)
