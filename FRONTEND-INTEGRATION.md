# Guest Coupon & Auto-Registration - Frontend Integration Guide

## Overview

Checkout now works for **both** logged-in and guest users. Guests are auto-registered with a generated password (sent via email) so they can log in later. Returning guests use the same email — no duplicate accounts, no re-sent password.

## How it works

| User State | `userId` in API calls | Behavior |
|---|---|---|
| **Logged in** | Provide actual `userId` | Full coupon validation (FIRST_TIME, SPECIFIC, perUserLimit), cart-based checkout |
| **Guest (no account)** | Omit `userId`, provide `email` + `firstName` + `lastName` + `items[]` | Coupon returns discount (skips user-specific checks). User auto-registered on payment. |
| **Returning guest (same email)** | Omit `userId`, provide same `email` | Fetches existing user silently — no error, no re-send of password. |

## Coupon Validation

### `POST /coupons/validate`

**Registered user:**
```json
{
  "code": "WELCOME10",
  "cartTotal": 99.99,
  "userId": "664f..."
}
```

**Guest / no account:**
```json
{
  "code": "WELCOME10",
  "cartTotal": 99.99
}
```

Guest response will include a `discountAmount` — user-specific checks (FIRST_TIME, SPECIFIC, perUserLimit) are **skipped**. All other checks still apply: active, expiry, usageLimit, minOrderAmount.

## Checkout (Create Payment Intent)

### `POST /payments/create-payment-intent`

**Registered user (cart-based — same as before):**
```json
{
  "userId": "664f...",
  "shippingAddress": { /* ... */ },
  "currency": "usd",
  "couponCode": "WELCOME10"
}
```
The cart must already exist (created via `POST /cart`). Items come from the cart.

**Guest user (inline items — no prior cart needed):**
```json
{
  "email": "guest@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Toronto",
    "province": "ON",
    "postalCode": "M5V 2T6",
    "country": "CA"
  },
  "items": [
    { "productId": "664f...", "quantity": 2 },
    { "productId": "664f...", "quantity": 1 }
  ],
  "currency": "cad",
  "couponCode": "WELCOME10"
}
```

**Returning guest (same email, no password re-sent):**
```json
{
  "email": "returning@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "shippingAddress": { /* ... */ },
  "items": [ /* ... */ ],
  "couponCode": "WELCOME10"
}
```

### Response (same for all flows)

```json
{
  "clientSecret": "pi_..._secret_...",
  "paymentIntentId": "pi_...",
  "totalAmount": 89.99,
  "currency": "cad",
  "coupon": {
    "code": "WELCOME10",
    "discountAmount": 10.00
  }
}
```

## Frontend Flow

### Guest Checkout

```
1. User fills checkout form (email, name, address)
2. [Optional] User enters coupon code → call POST /coupons/validate (no userId)
3. Frontend calls POST /payments/create-payment-intent with email + items[] (no userId)
4. Stripe Elements confirms payment with clientSecret
5. On success → backend auto-registers user, sends password email, sends confirmation email
6. Redirect to order confirmation page
```

### Registered User Checkout (unchanged)

```
1. User already logged in, items in cart
2. [Optional] Coupon validation → POST /coupons/validate (with userId)
3. Frontend calls POST /payments/create-payment-intent with userId (reads from cart)
4. Stripe confirms payment
5. Redirect to order confirmation page
```

### Registered User with inline items (new optional flow)

If a logged-in user wants to skip cart:
```
POST /payments/create-payment-intent
{
  "userId": "664f...",
  "shippingAddress": { ... },
  "items": [ { "productId": "...", "quantity": 1 } ],
  "couponCode": "WELCOME10"
}
```
Backend will update/create a cart for tracking purposes.

## Important Notes

1. **Coupon code** — always sent uppercase, but backend normalizes it
2. **Currency** — optional, defaults to `usd`. If currency detection is needed, the shipping country determines it (CA→CAD, otherwise→USD)
3. **Guest auto-registration** — the generated password is sent to the user's email so they can log in later. If the user never checks that email, they can still use the password reset flow
4. **Returning guest** — if the email already exists, the backend silently fetches the existing user (no error, no duplicate). The password email is NOT re-sent
5. **Error handling** — if product lookup fails (invalid productId), the payment intent will return a 400 error before any Stripe charge is made
6. **Stripe webhook** — `handlePaymentSuccess` is triggered by Stripe's `payment_intent.succeeded` webhook. Make sure the webhook is configured in your Stripe dashboard pointing to `POST /payments/webhook`
