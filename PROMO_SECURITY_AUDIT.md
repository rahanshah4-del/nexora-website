# Promo Firestore Security Findings

- `promoCodes/{UPPERCASE_CODE}` is managed only by verified backend-admin accounts.
- Signed-in clients cannot query or enumerate promo codes. They can only fetch an exact, active, unexpired code that still has capacity.
- Promo documents use an allowlisted schema with bounded strings, numbers, dates, arrays, and immutable creation metadata.
- NOWPayments records persist original, discount, and final amounts; payment writes must match the approved upgrade request.
- Promo code existence can still be tested by authenticated users who already know or guess a code. Codes should therefore be generated with sufficient entropy and should not contain sensitive information.
- `usedCount` is checked when applying a code and incremented by trusted backend/worker paths after an approved payment.

## Devil's Advocate Review

- Unauthenticated reads: denied because promo `get` requires an active signed-in user or the dedicated payment-worker UID.
- Code enumeration: denied because client `list` access is backend-admin only.
- Client writes: denied for create, update, and delete.
- Malformed admin writes: denied by required/allowlisted keys, bounded numeric values, timestamp ordering, immutable creation metadata, and document-ID/code equality.
- Payment-worker escalation: denied; it can only read promo documents and increment `usedCount` by exactly one while updating its timestamp.
- Discount tampering: the crypto worker reloads the plan and promo from Firestore and calculates the final amount server-side.

## Security Assessment

```json
{
  "security_assessment": {
    "level": "secure-default",
    "score": 94,
    "critical_issues": [],
    "high_issues": [],
    "medium_issues": [
      "Authenticated users who already know or guess a code can test whether it is currently valid.",
      "Manual bank-payment discounts remain subject to backend human approval; crypto discounts are fully server-verified."
    ],
    "low_issues": [
      "Usage counters represent completed approved payments and may not reserve capacity for checkouts still in progress."
    ],
    "recommended_actions": [
      "Keep generated promo codes high entropy.",
      "Review manual payment evidence before approval.",
      "Add reservation/redemption documents if strict limited-quantity campaigns are introduced."
    ]
  }
}
```
