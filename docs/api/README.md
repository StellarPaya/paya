# Paya API Documentation

Complete production-ready API documentation for the Paya payment platform backend services.

## Table of Contents

- [Overview](#overview)
- [Base URLs](#base-urls)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [API Services](#api-services)
  - [Authentication Service](./AUTHENTICATION.md)
  - [Conversion Engine](./CONVERSION_ENGINE.md)
  - [Notification Service](./NOTIFICATION_SERVICE.md)
  - [Payment Split Service](./PAYMENT_SPLIT.md)
  - [Refund Service](./REFUND_SERVICE.md)
  - [Subscription Service](./SUBSCRIPTION_SERVICE.md)
  - [Webhook Service](./WEBHOOK_SERVICE.md)
- [Interactive API Explorer](#interactive-api-explorer)

## Overview

The Paya API provides a comprehensive RESTful interface for managing payments, subscriptions, refunds, webhooks, and other payment-related operations. All endpoints use JSON for request and response bodies.

### API Version

Current API version: `v1`

### Supported HTTP Methods

- `GET` - Retrieve resources
- `POST` - Create resources
- `PUT` - Update resources (full update)
- `PATCH` - Update resources (partial update)
- `DELETE` - Remove resources

## Base URLs

| Environment | Base URL |
|-------------|----------|
| Production | `https://api.paya.io/api/v1` |
| Testnet | `https://test-api.paya.io/api/v1` |
| Local Development | `http://localhost:3000/api/v1` |

## Authentication

The Paya API uses JWT (JSON Web Token) authentication for securing endpoints.

### Authentication Methods

1. **JWT Bearer Token** - Used for most authenticated endpoints
2. **API Key** - Used for service-to-service authentication
3. **Public Endpoints** - Some endpoints are publicly accessible with rate limiting

See [Authentication Documentation](./AUTHENTICATION.md) for detailed information on authentication methods, token management, and security best practices.

### Authorization Header

```http
Authorization: Bearer <jwt_token>
```

### API Key Header

```http
X-API-Key: <api_key>
```

## Rate Limiting

The Paya API implements rate limiting to prevent abuse and ensure fair usage.

### Rate Limit Headers

All API responses include rate limit information in the headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1692844800
```

### Rate Limits by Endpoint

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication (register) | 5 requests | 60 seconds |
| Authentication (login) | 10 requests | 60 seconds |
| Authentication (refresh) | 20 requests | 60 seconds |
| Standard API calls | 100 requests | 60 seconds |
| Webhook delivery | 1000 requests | 60 seconds |
| Bulk operations | 10 requests | 60 seconds |

### Rate Limit Error Response

When rate limits are exceeded, the API returns:

```json
{
  "statusCode": 429,
  "message": "Too Many Requests",
  "error": "Rate limit exceeded",
  "retryAfter": 45
}
```

See [Rate Limiting Documentation](./RATE_LIMITING.md) for detailed rate limit policies and best practices.

## Error Handling

The Paya API uses standard HTTP status codes and provides detailed error messages.

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 204 | No Content - Request successful with no response body |
| 400 | Bad Request - Invalid request parameters |
| 401 | Unauthorized - Authentication required or invalid |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource conflict (e.g., duplicate) |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |
| 503 | Service Unavailable - Service temporarily unavailable |

### Error Response Format

All error responses follow this format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "errors": [
    {
      "field": "email",
      "message": "Email must be a valid email address"
    }
  ]
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `AUTH_INVALID_TOKEN` | Invalid or expired JWT token |
| `AUTH_INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `VALIDATION_ERROR` | Request validation failed |
| `RESOURCE_NOT_FOUND` | Requested resource does not exist |
| `RESOURCE_CONFLICT` | Resource already exists or conflicts |
| `RATE_LIMIT_EXCEEDED` | Rate limit has been exceeded |
| `SERVICE_UNAVAILABLE` | Service is temporarily unavailable |

See [Error Codes Documentation](./ERROR_CODES.md) for a complete list of error codes and troubleshooting guidance.

## API Services

### Authentication Service

Manages user authentication, registration, password management, and session handling.

- **Base Path**: `/auth`
- **Documentation**: [Authentication Service](./AUTHENTICATION.md)

### Conversion Engine

Handles currency conversions, price quotes, and conversion monitoring.

- **Base Path**: `/conversion-engine`
- **Documentation**: [Conversion Engine](./CONVERSION_ENGINE.md)

### Notification Service

Manages webhooks, email notifications, and event delivery.

- **Base Path**: `/notifications`
- **Documentation**: [Notification Service](./NOTIFICATION_SERVICE.md)

### Payment Split Service

Manages payment splitting among multiple recipients with support for milestones and conditions.

- **Base Path**: `/payment-splits`
- **Documentation**: [Payment Split Service](./PAYMENT_SPLIT.md)

### Refund Service

Handles refunds, disputes, evidence collection, and refund analytics.

- **Base Path**: `/refunds` and `/disputes`
- **Documentation**: [Refund Service](./REFUND_SERVICE.md)

### Subscription Service

Manages subscription plans, subscriptions, invoices, usage tracking, and dunning.

- **Base Path**: `/subscriptions`
- **Documentation**: [Subscription Service](./SUBSCRIPTION_SERVICE.md)

### Webhook Service

Manages webhook endpoints, event delivery, testing, and troubleshooting.

- **Base Path**: `/webhooks`
- **Documentation**: [Webhook Service](./WEBHOOK_SERVICE.md)

## Interactive API Explorer

An interactive API explorer is available for testing API endpoints directly from your browser.

- **Production**: https://api.paya.io/docs
- **Testnet**: https://test-api.paya.io/docs

The interactive explorer allows you to:
- Browse all available endpoints
- Test requests with sample payloads
- View real-time responses
- Generate code snippets in multiple languages
- Download OpenAPI specifications

## SDKs

Official SDKs are available for popular programming languages:

- [JavaScript/TypeScript SDK](https://github.com/paya/paya-js)
- [Python SDK](https://github.com/paya/paya-python)
- [Go SDK](https://github.com/paya/paya-go)

## Support

For API support and questions:
- Email: api-support@paya.io
- Documentation: https://docs.paya.io
- Status Page: https://status.paya.io

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for API version history and changes.
