# Paya Troubleshooting Guide

## Table of Contents
1. [Common Integration Errors](#common-integration-errors)
2. [Payment Failure Scenarios](#payment-failure-scenarios)
3. [Webhook Delivery Issues](#webhook-delivery-issues)
4. [Authentication Problems](#authentication-problems)
5. [Network Connectivity Issues](#network-connectivity-issues)
6. [Debugging Techniques](#debugging-techniques)

## Common Integration Errors

### Error: Invalid API Key

**Symptoms:**
```
401 Unauthorized
{
  "error": "Invalid API key"
}
```

**Causes:**
- Incorrect API key
- API key expired
- API key revoked
- Using test key in production

**Solutions:**

1. **Verify API Key**
```javascript
// Check your API key
console.log('API Key:', process.env.PAYA_API_KEY);

// Ensure no extra spaces or characters
const apiKey = process.env.PAYA_API_KEY.trim();
```

2. **Regenerate API Key**
- Go to [dashboard.paya.io](https://dashboard.paya.io)
- Navigate to API Keys section
- Generate a new API key
- Update your environment variables

3. **Check Environment**
```javascript
// Ensure you're using the right environment
const paya = new PayaClient({
  apiKey: process.env.PAYA_API_KEY,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'test',
});
```

### Error: Invalid Request

**Symptoms:**
```
400 Bad Request
{
  "error": "Invalid request",
  "details": "Missing required field: amount"
}
```

**Causes:**
- Missing required fields
- Invalid data types
- Invalid currency code
- Invalid email format

**Solutions:**

1. **Validate Request Data**
```javascript
function validatePaymentData(data) {
  const required = ['amount', 'currency', 'merchantId', 'customerEmail'];
  
  for (const field of required) {
    if (!data[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  if (typeof data.amount !== 'number' || data.amount <= 0) {
    throw new Error('Amount must be a positive number');
  }
  
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customerEmail)) {
    throw new Error('Invalid email format');
  }
  
  return true;
}

// Usage
try {
  validatePaymentData(paymentData);
  await paya.payments.create(paymentData);
} catch (error) {
  console.error('Validation error:', error.message);
}
```

2. **Use SDK Validation**
```javascript
// SDKs include built-in validation
const payment = await paya.payments.create({
  amount: 100.00,
  currency: 'XLM',
  merchantId: 'your_merchant_id',
  customerEmail: 'customer@example.com',
});
```

### Error: Merchant Not Found

**Symptoms:**
```
404 Not Found
{
  "error": "Merchant not found"
}
```

**Causes:**
- Invalid merchant ID
- Merchant account suspended
- Merchant account deleted

**Solutions:**

1. **Verify Merchant ID**
```javascript
// Check your merchant ID in dashboard
const merchantId = 'your_merchant_id';

// Verify merchant exists
try {
  const merchant = await paya.merchants.get(merchantId);
  console.log('Merchant found:', merchant.name);
} catch (error) {
  console.error('Merchant not found:', error.message);
}
```

2. **Contact Support**
If merchant ID is correct but still not found, contact support at support@paya.io

### Error: Rate Limit Exceeded

**Symptoms:**
```
429 Too Many Requests
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

**Causes:**
- Too many requests in short time
- Exceeded API rate limits
- DDoS protection triggered

**Solutions:**

1. **Implement Rate Limiting**
```javascript
class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async check() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const waitTime = this.windowMs - (now - this.requests[0]);
      throw new Error(`Rate limit exceeded. Wait ${waitTime}ms`);
    }
    
    this.requests.push(now);
  }
}

// Usage
const limiter = new RateLimiter(100, 60000); // 100 requests per minute

try {
  await limiter.check();
  await paya.payments.create(paymentData);
} catch (error) {
  console.error('Rate limit error:', error.message);
}
```

2. **Exponential Backoff**
```javascript
async function createPaymentWithRetry(paymentData, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await paya.payments.create(paymentData);
    } catch (error) {
      if (error.status === 429) {
        const waitTime = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        console.log(`Rate limited. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else if (i === maxRetries - 1) {
        throw error;
      }
    }
  }
}
```

## Payment Failure Scenarios

### Scenario: Payment Pending Too Long

**Symptoms:**
- Payment status stuck at `PENDING` or `PROCESSING`
- Payment not confirmed after expected time

**Causes:**
- Network congestion
- Stellar network issues
- Insufficient funds
- Invalid transaction

**Solutions:**

1. **Check Payment Status**
```javascript
async function checkPaymentStatus(paymentId) {
  const payment = await paya.payments.get(paymentId);
  console.log('Payment status:', payment.status);
  console.log('Transaction hash:', payment.transactionHash);
  
  if (payment.status === 'PENDING') {
    console.log('Payment is still processing...');
  } else if (payment.status === 'FAILED') {
    console.log('Payment failed:', payment.errorMessage);
  }
  
  return payment;
}
```

2. **Check Stellar Network**
```javascript
async function checkStellarNetwork() {
  try {
    const response = await axios.get('https://horizon.stellar.org/');
    console.log('Stellar network is operational');
    return true;
  } catch (error) {
    console.error('Stellar network is down:', error.message);
    return false;
  }
}
```

3. **Wait for Confirmation**
```javascript
async function waitForPaymentConfirmation(paymentId, timeout = 300000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const payment = await paya.payments.get(paymentId);
    
    if (payment.status === 'COMPLETED') {
      return payment;
    } else if (payment.status === 'FAILED') {
      throw new Error(`Payment failed: ${payment.errorMessage}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
  }
  
  throw new Error('Payment confirmation timeout');
}
```

### Scenario: Payment Failed

**Symptoms:**
- Payment status is `FAILED`
- Error message indicates failure reason

**Common Failure Reasons:**
- `INSUFFICIENT_FUNDS`: Not enough XLM in wallet
- `INVALID_ACCOUNT`: Invalid Stellar account
- `NETWORK_ERROR`: Stellar network issue
- `TIMEOUT`: Transaction timeout

**Solutions:**

1. **Check Failure Reason**
```javascript
const payment = await paya.payments.get(paymentId);
console.log('Failure reason:', payment.errorMessage);
console.log('Error code:', payment.errorCode);
```

2. **Handle Specific Failures**
```javascript
function handlePaymentFailure(payment) {
  switch (payment.errorCode) {
    case 'INSUFFICIENT_FUNDS':
      console.log('Customer needs to add funds to wallet');
      // Notify customer
      break;
    case 'INVALID_ACCOUNT':
      console.log('Invalid Stellar account');
      // Verify account
      break;
    case 'NETWORK_ERROR':
      console.log('Stellar network error');
      // Retry payment
      break;
    default:
      console.log('Unknown error:', payment.errorMessage);
  }
}
```

3. **Retry Failed Payment**
```javascript
async function retryPayment(paymentId) {
  const payment = await paya.payments.get(paymentId);
  
  if (payment.status === 'FAILED') {
    // Create new payment with same details
    const newPayment = await paya.payments.create({
      amount: payment.amount,
      currency: payment.currency,
      merchantId: payment.merchantId,
      customerEmail: payment.customerEmail,
      metadata: payment.metadata,
    });
    
    return newPayment;
  }
  
  return payment;
}
```

### Scenario: Duplicate Payment

**Symptoms:**
- Multiple payments created for same order
- Idempotency key not working

**Solutions:**

1. **Use Idempotency Key**
```javascript
import { v4 as uuidv4 } from 'uuid';

async function createPaymentWithIdempotency(paymentData) {
  const idempotencyKey = uuidv4();
  
  const payment = await paya.payments.create({
    ...paymentData,
    idempotencyKey,
  });
  
  return payment;
}
```

2. **Check for Existing Payment**
```javascript
async function findExistingPayment(orderId) {
  const payments = await paya.payments.list({
    metadata: { orderId },
  });
  
  if (payments.length > 0) {
    return payments[0];
  }
  
  return null;
}
```

## Webhook Delivery Issues

### Issue: Webhook Not Received

**Symptoms:**
- Webhook endpoint not receiving events
- No webhook logs in dashboard

**Causes:**
- Incorrect webhook URL
- Webhook not registered
- Server not accessible
- Firewall blocking requests

**Solutions:**

1. **Verify Webhook Registration**
```javascript
const webhooks = await paya.webhooks.list();
console.log('Registered webhooks:', webhooks);
```

2. **Test Webhook Endpoint**
```bash
# Test webhook endpoint locally
curl -X POST http://localhost:3000/webhooks/paya \
  -H "Content-Type: application/json" \
  -d '{"eventType":"test","data":{}}'
```

3. **Use Ngrok for Local Testing**
```bash
# Install ngrok
npm install -g ngrok

# Start ngrok
ngrok http 3000

# Use ngrok URL for webhook
```

4. **Check Server Logs**
```javascript
app.post('/webhooks/paya', (req, res) => {
  console.log('Webhook received:', req.body);
  console.log('Headers:', req.headers);
  
  res.status(200).send('OK');
});
```

### Issue: Invalid Webhook Signature

**Symptoms:**
- Signature verification failing
- Webhook rejected

**Causes:**
- Incorrect webhook secret
- Signature calculation error
- Payload encoding issue

**Solutions:**

1. **Verify Webhook Secret**
```javascript
const webhook = await paya.webhooks.get('webhook_id');
console.log('Webhook secret:', webhook.secret);
```

2. **Debug Signature Verification**
```javascript
import crypto from 'crypto';

function verifySignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  console.log('Received signature:', signature);
  console.log('Expected signature:', expectedSignature);
  console.log('Match:', signature === expectedSignature);
  
  return signature === expectedSignature;
}
```

3. **Use SDK Verification**
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

### Issue: Webhook Retries Failing

**Symptoms:**
- Webhook delivery failing repeatedly
- Max retry attempts reached

**Causes:**
- Webhook endpoint returning errors
- Timeout issues
- Server overloaded

**Solutions:**

1. **Check Webhook Delivery Status**
```javascript
const deliveries = await paya.webhooks.getDeliveries('webhook_id');
console.log('Delivery status:', deliveries);
```

2. **Improve Webhook Handler**
```javascript
app.post('/webhooks/paya', async (req, res) => {
  try {
    // Process webhook
    await handleWebhookEvent(req.body);
    
    // Return quickly
    res.status(200).send('OK');
    
    // Process asynchronously
    processEventAsync(req.body);
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});
```

3. **Add Timeout Handling**
```javascript
app.post('/webhooks/paya', (req, res) => {
  res.setTimeout(5000, () => {
    console.log('Webhook timeout');
    res.status(504).send('Timeout');
  });
  
  // Process webhook
});
```

## Authentication Problems

### Issue: API Key Not Working

**Symptoms:**
- 401 Unauthorized errors
- Authentication failing

**Solutions:**

1. **Check API Key Format**
```javascript
// API key should be 32 characters
const apiKey = process.env.PAYA_API_KEY;

if (apiKey.length !== 32) {
  console.error('Invalid API key length');
}
```

2. **Check Environment Variables**
```bash
# Check if API key is set
echo $PAYA_API_KEY

# Set API key
export PAYA_API_KEY=your_api_key_here
```

3. **Test API Key**
```javascript
async function testApiKey() {
  try {
    const merchant = await paya.merchants.get('your_merchant_id');
    console.log('API key is valid');
    return true;
  } catch (error) {
    console.error('API key is invalid:', error.message);
    return false;
  }
}
```

### Issue: JWT Token Expired

**Symptoms:**
- 401 Unauthorized with token expired message
- Authentication failing after some time

**Solutions:**

1. **Refresh Token**
```javascript
async function refreshToken() {
  const newToken = await paya.auth.refreshToken();
  console.log('New token:', newToken);
  return newToken;
}
```

2. **Implement Auto-Refresh**
```javascript
class AuthClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.token = null;
    this.tokenExpiry = null;
  }

  async getValidToken() {
    if (!this.token || Date.now() > this.tokenExpiry) {
      this.token = await this.refreshToken();
      this.tokenExpiry = Date.now() + (3600 * 1000); // 1 hour
    }
    return this.token;
  }
}
```

## Network Connectivity Issues

### Issue: Connection Timeout

**Symptoms:**
- Request timeout errors
- Network unreachable

**Causes:**
- Network connectivity issues
- Firewall blocking
- DNS resolution failure

**Solutions:**

1. **Check Network Connectivity**
```bash
# Test API connectivity
curl -I https://api.paya.io/api/v1/health

# Test DNS resolution
nslookup api.paya.io

# Test network route
traceroute api.paya.io
```

2. **Increase Timeout**
```javascript
const paya = new PayaClient({
  apiKey: 'your_api_key',
  timeout: 60000, // 60 seconds
});
```

3. **Implement Retry Logic**
```javascript
async function requestWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        if (i === maxRetries - 1) throw error;
        const waitTime = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error;
      }
    }
  }
}
```

### Issue: SSL Certificate Error

**Symptoms:**
- SSL certificate verification failed
- Self-signed certificate error

**Solutions:**

1. **Update CA Certificates**
```bash
# Update CA certificates
sudo apt-get update
sudo apt-get install ca-certificates
```

2. **Disable SSL Verification (Not Recommended for Production)**
```javascript
const paya = new PayaClient({
  apiKey: 'your_api_key',
  rejectUnauthorized: false, // Only for testing
});
```

## Debugging Techniques

### Enable Debug Logging

```javascript
const paya = new PayaClient({
  apiKey: 'your_api_key',
  debug: true, // Enable debug logging
});
```

### Use Network Inspection Tools

**Browser DevTools:**
1. Open Network tab
2. Make API request
3. Inspect request/response headers
4. Check timing and status

**Wireshark:**
```bash
# Capture network traffic
sudo wireshark
```

**tcpdump:**
```bash
# Capture HTTP traffic
sudo tcpdump -i eth0 -A -s 0 'tcp port 443 and host api.paya.io'
```

### Use API Testing Tools

**Postman:**
1. Import Paya API collection
2. Set environment variables
3. Test endpoints
4. Inspect responses

**cURL:**
```bash
# Test payment creation
curl -X POST https://api.paya.io/api/v1/payments \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "currency": "XLM",
    "merchantId": "your_merchant_id",
    "customerEmail": "customer@example.com"
  }'
```

### Log Requests and Responses

```javascript
import axios from 'axios';

const axiosInstance = axios.create();

// Request interceptor
axiosInstance.interceptors.request.use((config) => {
  console.log('Request:', {
    url: config.url,
    method: config.method,
    headers: config.headers,
    data: config.data,
  });
  return config;
});

// Response interceptor
axiosInstance.interceptors.response.use((response) => {
  console.log('Response:', {
    status: response.status,
    data: response.data,
  });
  return response;
});

const paya = new PayaClient({
  apiKey: 'your_api_key',
  httpClient: axiosInstance,
});
```

### Check Server Status

```javascript
async function checkServerStatus() {
  try {
    const response = await axios.get('https://api.paya.io/api/v1/health');
    console.log('Server status:', response.data);
    return response.data;
  } catch (error) {
    console.error('Server is down:', error.message);
    return null;
  }
}
```

### Monitor API Usage

```javascript
async function getApiUsage() {
  try {
    const usage = await paya.account.getUsage();
    console.log('API usage:', usage);
    console.log('Requests remaining:', usage.requestsRemaining);
    return usage;
  } catch (error) {
    console.error('Error getting usage:', error.message);
  }
}
```

## Getting Help

### Self-Service Resources

- **API Documentation**: https://api.paya.io/docs
- **Status Page**: https://status.paya.io
- **GitHub Issues**: https://github.com/0xNinx/paya/issues
- **Community Forum**: https://community.paya.io

### Contact Support

**Email:** support@paya.io  
**Slack:** #paya-support  
**Phone**: +1-555-0123 (24/7 for critical issues)

### When to Contact Support

Contact support when:
- You've tried all troubleshooting steps
- Issue affects production
- Security concern
- Data integrity issue
- API is down

### Information to Include

When contacting support, include:
- API key (or last 4 characters)
- Error message
- Request ID
- Timestamp
- Steps to reproduce
- Environment (test/production)

## Common Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| `INVALID_API_KEY` | Invalid API key | Verify API key in dashboard |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded | Implement rate limiting |
| `INVALID_REQUEST` | Invalid request data | Validate request fields |
| `MERCHANT_NOT_FOUND` | Merchant not found | Verify merchant ID |
| `PAYMENT_NOT_FOUND` | Payment not found | Verify payment ID |
| `INSUFFICIENT_FUNDS` | Insufficient funds | Add funds to wallet |
| `NETWORK_ERROR` | Network error | Retry request |
| `TIMEOUT` | Request timeout | Increase timeout or retry |
| `WEBHOOK_SIGNATURE_INVALID` | Invalid webhook signature | Verify webhook secret |
| `AUTHENTICATION_FAILED` | Authentication failed | Check API key or token |

## Best Practices

1. **Always validate input** before sending to API
2. **Implement error handling** for all API calls
3. **Use idempotency keys** to prevent duplicates
4. **Implement retry logic** for transient failures
5. **Monitor API usage** to avoid rate limits
6. **Test in sandbox** before production
7. **Keep SDKs updated** to latest version
8. **Use webhooks** for real-time updates
9. **Log all API calls** for debugging
10. **Handle edge cases** gracefully
