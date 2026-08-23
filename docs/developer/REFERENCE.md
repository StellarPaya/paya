# Paya Reference Documentation

## Table of Contents
1. [API Reference](#api-reference)
2. [SDK Reference](#sdk-reference)
3. [Configuration Reference](#configuration-reference)
4. [Error Code Reference](#error-code-reference)
5. [Status Code Reference](#status-code-reference)

## API Reference

### Base URL

**Production:** `https://api.paya.io/api/v1`  
**Test:** `https://test-api.paya.io/api/v1`

### Authentication

All API requests require authentication using your API key in the Authorization header:

```
Authorization: Bearer your_api_key
```

### Endpoints

#### Payments

##### Create Payment

**Endpoint:** `POST /payments`

**Request Body:**
```json
{
  "amount": 100.00,
  "currency": "XLM",
  "merchantId": "merchant_123",
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "description": "Product purchase",
  "redirectUrl": "https://your-website.com/success",
  "cancelUrl": "https://your-website.com/cancel",
  "metadata": {
    "orderId": "ORDER-123"
  }
}
```

**Response:**
```json
{
  "paymentId": "pay_abc123",
  "paymentUrl": "https://checkout.paya.io/pay_abc123",
  "status": "PENDING",
  "amount": 100.00,
  "currency": "XLM",
  "merchantId": "merchant_123",
  "customerId": "customer_456",
  "customerEmail": "customer@example.com",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

##### Get Payment

**Endpoint:** `GET /payments/{paymentId}`

**Response:**
```json
{
  "paymentId": "pay_abc123",
  "merchantId": "merchant_123",
  "customerId": "customer_456",
  "amount": 100.00,
  "currency": "XLM",
  "status": "COMPLETED",
  "transactionHash": "abc123...",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:05:00Z",
  "metadata": {
    "orderId": "ORDER-123"
  }
}
```

##### List Payments

**Endpoint:** `GET /payments`

**Query Parameters:**
- `status` (optional): Filter by status
- `limit` (optional): Number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date

**Response:**
```json
{
  "payments": [
    {
      "paymentId": "pay_abc123",
      "amount": 100.00,
      "currency": "XLM",
      "status": "COMPLETED"
    }
  ],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

##### Refund Payment

**Endpoint:** `POST /payments/{paymentId}/refund`

**Request Body:**
```json
{
  "amount": 50.00,
  "reason": "Customer request"
}
```

**Response:**
```json
{
  "refundId": "ref_abc123",
  "paymentId": "pay_abc123",
  "amount": 50.00,
  "currency": "XLM",
  "status": "PENDING",
  "reason": "Customer request",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### Subscriptions

##### Create Subscription Plan

**Endpoint:** `POST /subscriptions/plans`

**Request Body:**
```json
{
  "name": "Pro Plan",
  "amount": 29.99,
  "currency": "USD",
  "billingInterval": "monthly",
  "trialPeriodDays": 14,
  "gracePeriodDays": 3,
  "features": ["Feature 1", "Feature 2"]
}
```

**Response:**
```json
{
  "planId": "plan_abc123",
  "name": "Pro Plan",
  "amount": 29.99,
  "currency": "USD",
  "billingInterval": "monthly",
  "trialPeriodDays": 14,
  "status": "ACTIVE",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

##### Create Subscription

**Endpoint:** `POST /subscriptions`

**Request Body:**
```json
{
  "planId": "plan_abc123",
  "customerId": "customer_456",
  "customerEmail": "customer@example.com",
  "paymentMethodId": "pm_789",
  "trialPeriod": true
}
```

**Response:**
```json
{
  "subscriptionId": "sub_abc123",
  "planId": "plan_abc123",
  "customerId": "customer_456",
  "status": "TRIALING",
  "currentPeriodStart": "2024-01-01T00:00:00Z",
  "currentPeriodEnd": "2024-01-15T00:00:00Z",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

##### Cancel Subscription

**Endpoint:** `POST /subscriptions/{subscriptionId}/cancel`

**Request Body:**
```json
{
  "cancelAtPeriodEnd": true
}
```

**Response:**
```json
{
  "subscriptionId": "sub_abc123",
  "status": "CANCELLED",
  "cancelAtPeriodEnd": true,
  "cancelledAt": "2024-01-01T00:00:00Z"
}
```

#### Webhooks

##### Register Webhook

**Endpoint:** `POST /notifications/webhooks/register`

**Request Body:**
```json
{
  "url": "https://your-website.com/webhooks/paya",
  "events": ["payment.created", "payment.confirmed"],
  "secret": "your_webhook_secret"
}
```

**Response:**
```json
{
  "webhookId": "wh_abc123",
  "url": "https://your-website.com/webhooks/paya",
  "events": ["payment.created", "payment.confirmed"],
  "status": "ACTIVE",
  "secret": "your_webhook_secret",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

##### Get Webhook Deliveries

**Endpoint:** `GET /notifications/webhooks/{webhookId}/deliveries`

**Query Parameters:**
- `status` (optional): Filter by delivery status

**Response:**
```json
{
  "deliveries": [
    {
      "deliveryId": "del_abc123",
      "eventType": "payment.confirmed",
      "status": "SUCCESS",
      "statusCode": 200,
      "attemptNumber": 1,
      "deliveredAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## SDK Reference

### JavaScript SDK

#### PayaClient

**Constructor:**
```javascript
new PayaClient(config)
```

**Config Parameters:**
- `apiKey` (string, required): Your Paya API key
- `environment` (string, optional): `'test'` or `'production'` (default: `'production'`)
- `timeout` (number, optional): Request timeout in milliseconds (default: `30000`)
- `baseUrl` (string, optional): Custom base URL

**Methods:**

##### payments.create(paymentData)
Creates a new payment.

**Parameters:**
- `paymentData` (object): Payment creation data

**Returns:** Promise<Payment>

##### payments.get(paymentId)
Gets payment details.

**Parameters:**
- `paymentId` (string): Payment ID

**Returns:** Promise<Payment>

##### payments.list(filters)
Lists payments with optional filters.

**Parameters:**
- `filters` (object): Filter options

**Returns:** Promise<PaymentList>

##### payments.refund(paymentId, options)
Refunds a payment.

**Parameters:**
- `paymentId` (string): Payment ID
- `options` (object): Refund options

**Returns:** Promise<Refund>

##### subscriptions.create(subscriptionData)
Creates a new subscription.

**Parameters:**
- `subscriptionData` (object): Subscription creation data

**Returns:** Promise<Subscription>

##### subscriptions.get(subscriptionId)
Gets subscription details.

**Parameters:**
- `subscriptionId` (string): Subscription ID

**Returns:** Promise<Subscription>

##### subscriptions.cancel(subscriptionId, options)
Cancels a subscription.

**Parameters:**
- `subscriptionId` (string): Subscription ID
- `options` (object): Cancellation options

**Returns:** Promise<Subscription>

##### webhooks.createHandler(options)
Creates a webhook handler.

**Parameters:**
- `options` (object): Handler options

**Returns:** WebhookHandler

### Python SDK

#### PayaClient

**Constructor:**
```python
PayaClient(api_key, environment='production', timeout=30, base_url=None)
```

**Parameters:**
- `api_key` (str, required): Your Paya API key
- `environment` (str, optional): `'test'` or `'production'` (default: `'production'`)
- `timeout` (int, optional): Request timeout in seconds (default: `30`)
- `base_url` (str, optional): Custom base URL

**Methods:**

##### payments.create(payment_data)
Creates a new payment.

**Parameters:**
- `payment_data` (dict): Payment creation data

**Returns:** Payment

##### payments.get(payment_id)
Gets payment details.

**Parameters:**
- `payment_id` (str): Payment ID

**Returns:** Payment

##### payments.list(**filters)
Lists payments with optional filters.

**Parameters:**
- `filters` (kwargs): Filter options

**Returns:** PaymentList

##### payments.refund(payment_id, **options)
Refunds a payment.

**Parameters:**
- `payment_id` (str): Payment ID
- `options` (kwargs): Refund options

**Returns:** Refund

##### subscriptions.create(subscription_data)
Creates a new subscription.

**Parameters:**
- `subscription_data` (dict): Subscription creation data

**Returns:** Subscription

##### subscriptions.get(subscription_id)
Gets subscription details.

**Parameters:**
- `subscription_id` (str): Subscription ID

**Returns:** Subscription

##### subscriptions.cancel(subscription_id, **options)
Cancels a subscription.

**Parameters:**
- `subscription_id` (str): Subscription ID
- `options` (kwargs): Cancellation options

**Returns:** Subscription

### Go SDK

#### Config

```go
type Config struct {
    APIKey      string
    Environment Environment
    Timeout     int
    BaseURL     string
}
```

#### PayaClient

**Constructor:**
```go
func NewClient(config *Config) *PayaClient
```

**Methods:**

##### Payments.Create(request *CreatePaymentRequest) (*Payment, error)
Creates a new payment.

##### Payments.Get(paymentID string) (*Payment, error)
Gets payment details.

##### Payments.List(request *ListPaymentsRequest) (*PaymentList, error)
Lists payments with optional filters.

##### Payments.Refund(paymentID string, request *RefundPaymentRequest) (*Refund, error)
Refunds a payment.

##### Subscriptions.Create(request *CreateSubscriptionRequest) (*Subscription, error)
Creates a new subscription.

##### Subscriptions.Get(subscriptionID string) (*Subscription, error)
Gets subscription details.

##### Subscriptions.Cancel(subscriptionID string, request *CancelSubscriptionRequest) error
Cancels a subscription.

## Configuration Reference

### Environment Variables

#### Backend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment: `development`, `staging`, `production` |
| `PORT` | No | `3000` | Server port |
| `API_PREFIX` | No | `api/v1` | API URL prefix |
| `DATABASE_HOST` | Yes | - | Database host |
| `DATABASE_PORT` | No | `5432` | Database port |
| `DATABASE_USER` | Yes | - | Database username |
| `DATABASE_PASSWORD` | Yes | - | Database password |
| `DATABASE_NAME` | Yes | - | Database name |
| `DATABASE_SYNCHRONIZE` | No | `false` | Auto-synchronize database schema |
| `DATABASE_LOGGING` | No | `true` | Enable database logging |
| `REDIS_HOST` | Yes | - | Redis host |
| `REDIS_PORT` | No | `6379` | Redis port |
| `REDIS_PASSWORD` | No | - | Redis password |
| `STELLAR_NETWORK` | Yes | - | Stellar network: `testnet`, `mainnet` |
| `STELLAR_HORIZON_URL` | Yes | - | Stellar Horizon API URL |
| `SOROBAN_RPC_URL` | Yes | - | Soroban RPC URL |
| `PAYMENT_CONTRACT_ID` | Yes | - | Payment smart contract ID |
| `SUBSCRIPTION_CONTRACT_ID` | Yes | - | Subscription smart contract ID |
| `JWT_SECRET` | Yes | - | JWT secret key (min 32 characters) |
| `JWT_EXPIRATION` | No | `7d` | JWT token expiration |
| `EMAIL_FROM` | No | - | Default sender email |
| `SENDGRID_API_KEY` | No | - | SendGrid API key |
| `WEBHOOK_SECRET` | Yes | - | Webhook signature secret |
| `RATE_LIMIT_TTL` | No | `60` | Rate limit TTL in seconds |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per TTL |
| `CORS_ORIGIN` | No | `*` | CORS allowed origin |

#### Frontend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | - | Backend API URL |
| `VITE_WS_URL` | Yes | - | WebSocket URL |
| `VITE_STELLAR_NETWORK` | Yes | - | Stellar network |
| `VITE_STELLAR_HORIZON_URL` | Yes | - | Stellar Horizon URL |
| `VITE_ENABLE_SUBSCRIPTIONS` | No | `true` | Enable subscription feature |
| `VITE_ENABLE_ESCROW` | No | `true` | Enable escrow feature |

### SDK Configuration

#### JavaScript SDK

```javascript
const config = {
  apiKey: 'your_api_key',
  environment: 'production',
  timeout: 30000,
  baseUrl: 'https://api.paya.io/api/v1',
};
```

#### Python SDK

```python
config = {
    'api_key': 'your_api_key',
    'environment': 'production',
    'timeout': 30,
    'base_url': 'https://api.paya.io/api/v1',
}
```

#### Go SDK

```go
config := &paya.Config{
    APIKey:      "your_api_key",
    Environment: paya.EnvironmentProduction,
    Timeout:     30,
    BaseURL:     "https://api.paya.io/api/v1",
}
```

## Error Code Reference

### Authentication Errors

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | Invalid or expired API key |
| `AUTHENTICATION_FAILED` | 401 | Authentication failed |
| `TOKEN_EXPIRED` | 401 | JWT token expired |
| `INSUFFICIENT_PERMISSIONS` | 403 | Insufficient permissions |

### Request Errors

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Invalid request format |
| `MISSING_REQUIRED_FIELD` | 400 | Missing required field |
| `INVALID_FIELD_VALUE` | 400 | Invalid field value |
| `VALIDATION_ERROR` | 400 | Validation error |

### Resource Errors

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `RESOURCE_NOT_FOUND` | 404 | Resource not found |
| `MERCHANT_NOT_FOUND` | 404 | Merchant not found |
| `PAYMENT_NOT_FOUND` | 404 | Payment not found |
| `SUBSCRIPTION_NOT_FOUND` | 404 | Subscription not found |
| `PLAN_NOT_FOUND` | 404 | Plan not found |

### Payment Errors

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INSUFFICIENT_FUNDS` | 400 | Insufficient funds in wallet |
| `INVALID_ACCOUNT` | 400 | Invalid Stellar account |
| `NETWORK_ERROR` | 502 | Stellar network error |
| `TIMEOUT` | 504 | Transaction timeout |
| `PAYMENT_FAILED` | 400 | Payment failed |
| `DUPLICATE_PAYMENT` | 409 | Duplicate payment |

### Subscription Errors

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `SUBSCRIPTION_ALREADY_EXISTS` | 409 | Subscription already exists |
| `PLAN_INACTIVE` | 400 | Plan is inactive |
| `PAYMENT_METHOD_FAILED` | 400 | Payment method failed |
| `SUBSCRIPTION_CANCELLED` | 400 | Subscription is cancelled |

### Rate Limit Errors

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |

### Server Errors

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INTERNAL_SERVER_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service unavailable |
| `DATABASE_ERROR` | 500 | Database error |

## Status Code Reference

### Payment Status

| Status | Description |
|--------|-------------|
| `PENDING` | Payment initiated, awaiting confirmation |
| `PROCESSING` | Payment being processed on network |
| `COMPLETED` | Payment completed successfully |
| `FAILED` | Payment failed |
| `REFUNDED` | Payment refunded |
| `CANCELLED` | Payment cancelled |

### Subscription Status

| Status | Description |
|--------|-------------|
| `ACTIVE` | Subscription is active |
| `TRIALING` | Subscription in trial period |
| `PAUSED` | Subscription is paused |
| `CANCELLED` | Subscription is cancelled |
| `EXPIRED` | Subscription expired |

### Plan Status

| Status | Description |
|--------|-------------|
| `ACTIVE` | Plan is active |
| `INACTIVE` | Plan is inactive |
| `ARCHIVED` | Plan is archived |

### Invoice Status

| Status | Description |
|--------|-------------|
| `PENDING` | Invoice pending payment |
| `PROCESSING` | Invoice being processed |
| `PAID` | Invoice paid |
| `FAILED` | Invoice payment failed |
| `VOID` | Invoice voided |
| `REFUNDED` | Invoice refunded |

### Webhook Status

| Status | Description |
|--------|-------------|
| `ACTIVE` | Webhook is active |
| `INACTIVE` | Webhook is inactive |
| `DISABLED` | Webhook is disabled |

### Webhook Delivery Status

| Status | Description |
|--------|-------------|
| `PENDING` | Delivery pending |
| `SUCCESS` | Delivery successful |
| `FAILED` | Delivery failed |
| `RETRYING` | Delivery retrying |

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 502 | Bad Gateway |
| 503 | Service Unavailable |
| 504 | Gateway Timeout |

## Data Types

### Payment Object

```typescript
{
  paymentId: string;
  merchantId: string;
  customerId: string;
  customerEmail: string;
  customerName?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  transactionHash?: string;
  description?: string;
  redirectUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### Subscription Object

```typescript
{
  subscriptionId: string;
  planId: string;
  customerId: string;
  customerEmail: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  cancelAt?: Date;
  cancelledAt?: Date;
  pausedAt?: Date;
  resumeAt?: Date;
  billingCycleCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Webhook Event Object

```typescript
{
  eventType: string;
  eventId: string;
  timestamp: Date;
  data: Record<string, any>;
}
```

## Currency Codes

Supported currencies for payments:

- `XLM` - Stellar Lumens
- `USD` - US Dollar
- `EUR` - Euro
- `GBP` - British Pound
- `JPY` - Japanese Yen
- Additional Stellar assets (custom)

## Billing Intervals

Supported subscription billing intervals:

- `daily` - Daily billing
- `weekly` - Weekly billing
- `monthly` - Monthly billing
- `yearly` - Yearly billing

## Rate Limits

| Plan | Requests/Minute | Requests/Hour | Requests/Day |
|------|----------------|---------------|--------------|
| Free | 60 | 1,000 | 10,000 |
| Pro | 300 | 5,000 | 50,000 |
| Enterprise | 1,000 | 20,000 | 200,000 |

## Webhook Events

### Payment Events

- `payment.created` - Payment initiated
- `payment.processing` - Payment processing
- `payment.confirmed` - Payment confirmed
- `payment.failed` - Payment failed
- `payment.refunded` - Payment refunded
- `payment.cancelled` - Payment cancelled

### Subscription Events

- `subscription.created` - Subscription created
- `subscription.trial_started` - Trial started
- `subscription.trial_ended` - Trial ended
- `subscription.billed` - Subscription billed
- `subscription.cancelled` - Subscription cancelled
- `subscription.paused` - Subscription paused
- `subscription.resumed` - Subscription resumed
- `subscription.updated` - Subscription updated

### Invoice Events

- `invoice.created` - Invoice created
- `invoice.paid` - Invoice paid
- `invoice.failed` - Invoice payment failed
- `invoice.voided` - Invoice voided

## API Versioning

Paya uses URL-based versioning:

- Current version: `v1`
- URL format: `https://api.paya.io/api/v1/...`

Deprecated versions will be supported for at least 6 months after deprecation notice.

## Support

For API reference questions, contact:
- **API Documentation**: https://api.paya.io/docs
- **Email**: api@paya.io
- **Slack**: #paya-api
