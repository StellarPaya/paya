# Paya SDK Documentation

## Table of Contents
1. [JavaScript SDK](#javascript-sdk)
2. [Python SDK](#python-sdk)
3. [Go SDK](#go-sdk)

## JavaScript SDK

### Installation

```bash
npm install @paya/sdk
# or
yarn add @paya/sdk
```

### Setup

```javascript
import { PayaClient } from '@paya/sdk';

const paya = new PayaClient({
  apiKey: 'your_api_key',
  environment: 'production', // or 'test'
  timeout: 30000, // optional: request timeout in milliseconds
});
```

### Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `apiKey` | string | Yes | - | Your Paya API key |
| `environment` | string | No | `'production'` | Environment: `'test'` or `'production'` |
| `timeout` | number | No | `30000` | Request timeout in milliseconds |
| `baseUrl` | string | No | Auto-detected | Custom base URL for API |

### Payments

#### Create Payment

```javascript
const payment = await paya.payments.create({
  amount: 100.00,
  currency: 'XLM',
  merchantId: 'your_merchant_id',
  customerEmail: 'customer@example.com',
  customerName: 'John Doe',
  description: 'Product purchase',
  redirectUrl: 'https://your-website.com/success',
  cancelUrl: 'https://your-website.com/cancel',
  metadata: {
    orderId: 'ORDER-123',
    productId: 'PROD-456',
  },
});
```

**Parameters:**
- `amount` (number, required): Payment amount
- `currency` (string, required): Currency code (e.g., 'XLM', 'USD')
- `merchantId` (string, required): Your merchant ID
- `customerEmail` (string, required): Customer email
- `customerName` (string, optional): Customer name
- `description` (string, optional): Payment description
- `redirectUrl` (string, optional): URL to redirect after successful payment
- `cancelUrl` (string, optional): URL to redirect after cancelled payment
- `metadata` (object, optional): Custom metadata

**Returns:**
```typescript
{
  paymentId: string;
  paymentUrl: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  amount: number;
  currency: string;
  createdAt: Date;
}
```

#### Get Payment

```javascript
const payment = await paya.payments.get('payment_id');
```

**Parameters:**
- `paymentId` (string, required): Payment ID

**Returns:**
```typescript
{
  paymentId: string;
  merchantId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  transactionHash?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}
```

#### List Payments

```javascript
const payments = await paya.payments.list({
  status: 'COMPLETED',
  limit: 10,
  offset: 0,
  startDate: '2024-01-01',
  endDate: '2024-12-31',
});
```

**Parameters:**
- `status` (string, optional): Filter by status
- `limit` (number, optional): Number of results (default: 20, max: 100)
- `offset` (number, optional): Pagination offset
- `startDate` (string, optional): Filter by start date
- `endDate` (string, optional): Filter by end date

**Returns:**
```typescript
{
  payments: Payment[];
  total: number;
  limit: number;
  offset: number;
}
```

#### Refund Payment

```javascript
const refund = await paya.payments.refund('payment_id', {
  amount: 50.00, // optional: full refund if not specified
  reason: 'Customer request',
});
```

**Parameters:**
- `paymentId` (string, required): Payment ID
- `amount` (number, optional): Refund amount (full refund if not specified)
- `reason` (string, optional): Refund reason

**Returns:**
```typescript
{
  refundId: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  reason: string;
  createdAt: Date;
}
```

#### Wait for Confirmation

```javascript
const payment = await paya.payments.waitForConfirmation('payment_id', {
  timeout: 300000, // 5 minutes
  pollInterval: 5000, // 5 seconds
});
```

**Parameters:**
- `paymentId` (string, required): Payment ID
- `timeout` (number, optional): Timeout in milliseconds (default: 300000)
- `pollInterval` (number, optional): Poll interval in milliseconds (default: 5000)

**Returns:** Payment object when confirmed

### Subscriptions

#### Create Subscription

```javascript
const subscription = await paya.subscriptions.create({
  planId: 'plan_123',
  customerId: 'customer_456',
  customerEmail: 'customer@example.com',
  paymentMethodId: 'payment_method_789',
  trialPeriod: true,
  cancelAtPeriodEnd: false,
});
```

**Parameters:**
- `planId` (string, required): Plan ID
- `customerId` (string, required): Customer ID
- `customerEmail` (string, required): Customer email
- `paymentMethodId` (string, required): Payment method ID
- `trialPeriod` (boolean, optional): Enable trial period
- `cancelAtPeriodEnd` (boolean, optional): Cancel at period end

**Returns:**
```typescript
{
  subscriptionId: string;
  planId: string;
  customerId: string;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'TRIALING';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
}
```

#### Get Subscription

```javascript
const subscription = await paya.subscriptions.get('subscription_id');
```

#### List Subscriptions

```javascript
const subscriptions = await paya.subscriptions.list({
  status: 'ACTIVE',
  limit: 10,
});
```

#### Cancel Subscription

```javascript
await paya.subscriptions.cancel('subscription_id', {
  cancelAtPeriodEnd: true,
});
```

#### Update Subscription

```javascript
const subscription = await paya.subscriptions.update('subscription_id', {
  planId: 'new_plan_id',
  paymentMethodId: 'new_payment_method_id',
});
```

### Webhooks

#### Create Webhook Handler

```javascript
const webhookHandler = paya.webhooks.createHandler({
  secret: 'your_webhook_secret',
});
```

#### Handle Events

```javascript
webhookHandler.on('payment.created', (data) => {
  console.log('Payment created:', data.paymentId);
});

webhookHandler.on('payment.confirmed', (data) => {
  console.log('Payment confirmed:', data.paymentId);
  // Handle payment confirmation
});

webhookHandler.on('payment.failed', (data) => {
  console.log('Payment failed:', data.paymentId);
  // Handle payment failure
});

webhookHandler.on('subscription.billed', (data) => {
  console.log('Subscription billed:', data.subscriptionId);
  // Handle subscription billing
});
```

#### Express.js Middleware

```javascript
app.post('/webhooks/paya', webhookHandler.middleware());
```

#### Verify Webhook Signature

```javascript
const isValid = paya.webhooks.verifySignature(
  payload,
  signature,
  'your_webhook_secret'
);
```

### Error Handling

```javascript
try {
  const payment = await paya.payments.create({
    amount: 100.00,
    currency: 'XLM',
    merchantId: 'your_merchant_id',
    customerEmail: 'customer@example.com',
  });
} catch (error) {
  if (error instanceof PayaAPIError) {
    console.error('API Error:', error.message);
    console.error('Status:', error.status);
    console.error('Code:', error.code);
  } else if (error instanceof PayaNetworkError) {
    console.error('Network Error:', error.message);
  } else {
    console.error('Unknown Error:', error);
  }
}
```

### Error Types

- `PayaAPIError`: API returned an error response
- `PayaNetworkError`: Network error occurred
- `PayaValidationError`: Request validation failed
- `PayaAuthenticationError`: Authentication failed

## Python SDK

### Installation

```bash
pip install paya-sdk
```

### Setup

```python
from paya import PayaClient

paya = PayaClient(
    api_key='your_api_key',
    environment='production',  # or 'test'
    timeout=30,  # optional: request timeout in seconds
)
```

### Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `api_key` | str | Yes | - | Your Paya API key |
| `environment` | str | No | `'production'` | Environment: `'test'` or `'production'` |
| `timeout` | int | No | `30` | Request timeout in seconds |
| `base_url` | str | No | Auto-detected | Custom base URL for API |

### Payments

#### Create Payment

```python
payment = paya.payments.create(
    amount=100.00,
    currency='XLM',
    merchant_id='your_merchant_id',
    customer_email='customer@example.com',
    customer_name='John Doe',
    description='Product purchase',
    redirect_url='https://your-website.com/success',
    cancel_url='https://your-website.com/cancel',
    metadata={
        'order_id': 'ORDER-123',
        'product_id': 'PROD-456',
    }
)
```

**Parameters:**
- `amount` (float, required): Payment amount
- `currency` (str, required): Currency code
- `merchant_id` (str, required): Your merchant ID
- `customer_email` (str, required): Customer email
- `customer_name` (str, optional): Customer name
- `description` (str, optional): Payment description
- `redirect_url` (str, optional): Redirect URL
- `cancel_url` (str, optional): Cancel URL
- `metadata` (dict, optional): Custom metadata

**Returns:** Payment object

#### Get Payment

```python
payment = paya.payments.get('payment_id')
```

#### List Payments

```python
payments = paya.payments.list(
    status='COMPLETED',
    limit=10,
    offset=0,
    start_date='2024-01-01',
    end_date='2024-12-31'
)
```

#### Refund Payment

```python
refund = paya.payments.refund(
    'payment_id',
    amount=50.00,  # optional
    reason='Customer request'
)
```

#### Wait for Confirmation

```python
payment = paya.payments.wait_for_confirmation(
    'payment_id',
    timeout=300,  # 5 minutes
    poll_interval=5  # 5 seconds
)
```

### Subscriptions

#### Create Subscription

```python
subscription = paya.subscriptions.create(
    plan_id='plan_123',
    customer_id='customer_456',
    customer_email='customer@example.com',
    payment_method_id='payment_method_789',
    trial_period=True,
    cancel_at_period_end=False
)
```

#### Get Subscription

```python
subscription = paya.subscriptions.get('subscription_id')
```

#### List Subscriptions

```python
subscriptions = paya.subscriptions.list(
    status='ACTIVE',
    limit=10
)
```

#### Cancel Subscription

```python
paya.subscriptions.cancel(
    'subscription_id',
    cancel_at_period_end=True
)
```

#### Update Subscription

```python
subscription = paya.subscriptions.update(
    'subscription_id',
    plan_id='new_plan_id',
    payment_method_id='new_payment_method_id'
)
```

### Webhooks

#### Create Webhook Handler

```python
from paya.webhooks import WebhookHandler

webhook_handler = WebhookHandler(secret='your_webhook_secret')
```

#### Handle Events

```python
@webhook_handler.on('payment.created')
def handle_payment_created(data):
    print(f"Payment created: {data['payment_id']}")

@webhook_handler.on('payment.confirmed')
def handle_payment_confirmed(data):
    print(f"Payment confirmed: {data['payment_id']}")
    # Handle payment confirmation

@webhook_handler.on('payment.failed')
def handle_payment_failed(data):
    print(f"Payment failed: {data['payment_id']}")
    # Handle payment failure
```

#### Flask Integration

```python
from flask import Flask, request

app = Flask(__name__)

@app.route('/webhooks/paya', methods=['POST'])
def handle_webhook():
    event = webhook_handler.verify(request)
    # Event is automatically routed to handlers
    return 'OK', 200
```

#### Verify Signature

```python
is_valid = paya.webhooks.verify_signature(
    payload,
    signature,
    'your_webhook_secret'
)
```

### Error Handling

```python
from paya.errors import PayaAPIError, PayaNetworkError, PayaValidationError

try:
    payment = paya.payments.create(
        amount=100.00,
        currency='XLM',
        merchant_id='your_merchant_id',
        customer_email='customer@example.com'
    )
except PayaAPIError as e:
    print(f"API Error: {e.message}")
    print(f"Status: {e.status}")
    print(f"Code: {e.code}")
except PayaNetworkError as e:
    print(f"Network Error: {e.message}")
except PayaValidationError as e:
    print(f"Validation Error: {e.message}")
except Exception as e:
    print(f"Unknown Error: {e}")
```

### Error Types

- `PayaAPIError`: API returned an error response
- `PayaNetworkError`: Network error occurred
- `PayaValidationError`: Request validation failed
- `PayaAuthenticationError`: Authentication failed

## Go SDK

### Installation

```bash
go get github.com/0xNinx/paya-go-sdk
```

### Setup

```go
package main

import (
    "github.com/0xNinx/paya-go-sdk"
)

func main() {
    client := paya.NewClient(&paya.Config{
        APIKey:      "your_api_key",
        Environment: paya.EnvironmentProduction, // or paya.EnvironmentTest
        Timeout:     30, // optional: request timeout in seconds
    })
}
```

### Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `APIKey` | string | Yes | - | Your Paya API key |
| `Environment` | Environment | No | `EnvironmentProduction` | Environment |
| `Timeout` | int | No | `30` | Request timeout in seconds |
| `BaseURL` | string | No | Auto-detected | Custom base URL for API |

### Payments

#### Create Payment

```go
payment, err := client.Payments.Create(&paya.CreatePaymentRequest{
    Amount:        100.00,
    Currency:      "XLM",
    MerchantID:    "your_merchant_id",
    CustomerEmail: "customer@example.com",
    CustomerName:  "John Doe",
    Description:   "Product purchase",
    RedirectURL:   "https://your-website.com/success",
    CancelURL:     "https://your-website.com/cancel",
    Metadata: map[string]interface{}{
        "order_id":   "ORDER-123",
        "product_id": "PROD-456",
    },
})

if err != nil {
    panic(err)
}
```

**Parameters:**
- `Amount` (float64, required): Payment amount
- `Currency` (string, required): Currency code
- `MerchantID` (string, required): Your merchant ID
- `CustomerEmail` (string, required): Customer email
- `CustomerName` (string, optional): Customer name
- `Description` (string, optional): Payment description
- `RedirectURL` (string, optional): Redirect URL
- `CancelURL` (string, optional): Cancel URL
- `Metadata` (map[string]interface{}, optional): Custom metadata

**Returns:** Payment object

#### Get Payment

```go
payment, err := client.Payments.Get("payment_id")

if err != nil {
    panic(err)
}
```

#### List Payments

```go
payments, err := client.Payments.List(&paya.ListPaymentsRequest{
    Status:    paya.PaymentStatusCompleted,
    Limit:     10,
    Offset:    0,
    StartDate: "2024-01-01",
    EndDate:   "2024-12-31",
})

if err != nil {
    panic(err)
}
```

#### Refund Payment

```go
refund, err := client.Payments.Refund("payment_id", &paya.RefundPaymentRequest{
    Amount: 50.00, // optional
    Reason: "Customer request",
})

if err != nil {
    panic(err)
}
```

#### Wait for Confirmation

```go
payment, err := client.Payments.WaitForConfirmation(
    "payment_id",
    &paya.WaitForConfirmationOptions{
        Timeout:      300, // 5 minutes
        PollInterval: 5,  // 5 seconds
    },
)

if err != nil {
    panic(err)
}
```

### Subscriptions

#### Create Subscription

```go
subscription, err := client.Subscriptions.Create(&paya.CreateSubscriptionRequest{
    PlanID:         "plan_123",
    CustomerID:     "customer_456",
    CustomerEmail:  "customer@example.com",
    PaymentMethodID: "payment_method_789",
    TrialPeriod:    true,
    CancelAtPeriodEnd: false,
})

if err != nil {
    panic(err)
}
```

#### Get Subscription

```go
subscription, err := client.Subscriptions.Get("subscription_id")

if err != nil {
    panic(err)
}
```

#### List Subscriptions

```go
subscriptions, err := client.Subscriptions.List(&paya.ListSubscriptionsRequest{
    Status: paya.SubscriptionStatusActive,
    Limit:  10,
})

if err != nil {
    panic(err)
}
```

#### Cancel Subscription

```go
err := client.Subscriptions.Cancel("subscription_id", &paya.CancelSubscriptionRequest{
    CancelAtPeriodEnd: true,
})

if err != nil {
    panic(err)
}
```

#### Update Subscription

```go
subscription, err := client.Subscriptions.Update("subscription_id", &paya.UpdateSubscriptionRequest{
    PlanID:         "new_plan_id",
    PaymentMethodID: "new_payment_method_id",
})

if err != nil {
    panic(err)
}
```

### Webhooks

#### Create Webhook Handler

```go
import "github.com/0xNinx/paya-go-sdk/webhooks"

handler := webhooks.NewHandler("your_webhook_secret")
```

#### Handle Events

```go
handler.On("payment.created", func(data map[string]interface{}) {
    fmt.Printf("Payment created: %s\n", data["payment_id"])
})

handler.On("payment.confirmed", func(data map[string]interface{}) {
    fmt.Printf("Payment confirmed: %s\n", data["payment_id"])
    // Handle payment confirmation
})

handler.On("payment.failed", func(data map[string]interface{}) {
    fmt.Printf("Payment failed: %s\n", data["payment_id"])
    // Handle payment failure
})
```

#### HTTP Server Integration

```go
package main

import (
    "net/http"
    "github.com/0xNinx/paya-go-sdk/webhooks"
)

func webhookHandler(w http.ResponseWriter, r *http.Request) {
    handler := webhooks.NewHandler("your_webhook_secret")
    
    event, err := handler.Verify(r)
    if err != nil {
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }
    
    // Event is automatically routed to handlers
    handler.Dispatch(event)
    
    w.WriteHeader(http.StatusOK)
}

func main() {
    http.HandleFunc("/webhooks/paya", webhookHandler)
    http.ListenAndServe(":3000", nil)
}
```

#### Verify Signature

```go
isValid := webhooks.VerifySignature(
    payload,
    signature,
    "your_webhook_secret",
)
```

### Error Handling

```go
payment, err := client.Payments.Create(&paya.CreatePaymentRequest{
    Amount:        100.00,
    Currency:      "XLM",
    MerchantID:    "your_merchant_id",
    CustomerEmail: "customer@example.com",
})

if err != nil {
    switch e := err.(type) {
    case *paya.APIError:
        fmt.Printf("API Error: %s\n", e.Message)
        fmt.Printf("Status: %d\n", e.Status)
        fmt.Printf("Code: %s\n", e.Code)
    case *paya.NetworkError:
        fmt.Printf("Network Error: %s\n", e.Message)
    case *paya.ValidationError:
        fmt.Printf("Validation Error: %s\n", e.Message)
    default:
        fmt.Printf("Unknown Error: %s\n", err)
    }
}
```

### Error Types

- `APIError`: API returned an error response
- `NetworkError`: Network error occurred
- `ValidationError`: Request validation failed
- `AuthenticationError`: Authentication failed

## Advanced Features

### Payment Splits

```javascript
const payment = await paya.payments.create({
  amount: 100.00,
  currency: 'XLM',
  merchantId: 'your_merchant_id',
  customerEmail: 'customer@example.com',
  splits: [
    {
      recipientId: 'recipient_1',
      amount: 60.00,
      percentage: 60,
    },
    {
      recipientId: 'recipient_2',
      amount: 40.00,
      percentage: 40,
    },
  ],
});
```

### Escrow

```javascript
const payment = await paya.payments.create({
  amount: 100.00,
  currency: 'XLM',
  merchantId: 'your_merchant_id',
  customerEmail: 'customer@example.com',
  escrow: {
    enabled: true,
    releaseCondition: 'delivery_confirmed',
    holdPeriod: 7, // days
  },
});
```

### Custom Metadata

```javascript
const payment = await paya.payments.create({
  amount: 100.00,
  currency: 'XLM',
  merchantId: 'your_merchant_id',
  customerEmail: 'customer@example.com',
  metadata: {
    orderId: 'ORDER-123',
    productId: 'PROD-456',
    customField: 'custom_value',
  },
});
```

## Best Practices

### Error Handling

Always handle errors properly:

```javascript
try {
  const payment = await paya.payments.create({...});
} catch (error) {
  // Handle error appropriately
  console.error('Payment failed:', error);
  // Retry logic
  // User notification
}
```

### Retry Logic

Implement retry logic for transient failures:

```javascript
async function createPaymentWithRetry(paymentData, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await paya.payments.create(paymentData);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### Idempotency

Use idempotency keys to prevent duplicate payments:

```javascript
const payment = await paya.payments.create({
  amount: 100.00,
  currency: 'XLM',
  merchantId: 'your_merchant_id',
  customerEmail: 'customer@example.com',
  idempotencyKey: 'unique_key_for_this_payment',
});
```

### Webhook Verification

Always verify webhook signatures:

```javascript
const isValid = paya.webhooks.verifySignature(
  payload,
  signature,
  'your_webhook_secret'
);

if (!isValid) {
  throw new Error('Invalid webhook signature');
}
```

## Support

For SDK issues, contact:
- **GitHub Issues**: https://github.com/0xNinx/paya/issues
- **Email**: sdk@paya.io
- **Slack**: #paya-sdk
