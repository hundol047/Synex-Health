# Billing

IMPLEMENTED: Free / Plus monthly / Plus annual storefront selection, purchase, restore, server RevenueCat entitlement verification, account logout, authenticated webhook refresh. States: free, trial, active, grace_period, billing_issue, cancelled, expired, refunded. Cancellation preserves access until paid expiry; a verified grace period preserves access until its deadline; refunds revoke access. Failed verification does not grant access. Client-supplied plan/receipt/customer identifiers cannot grant Plus.

Source: https://www.revenuecat.com/docs/subscription-guidance/how-grace-periods-work and https://www.revenuecat.com/docs/api-v1/customer-info-model . Webhook refresh always retrieves the authoritative subscriber; duplicate events do not directly grant privileges. Concurrent refresh reconciliation and provider rate limits still need load testing.

VERIFIED: mocked server state tests, grace expiry, cancellation/refund and repeated webhook regression checks. EXTERNAL SETUP REQUIRED: registered App Store/Play products, RevenueCat keys/entitlement/offering, webhook authorization, real store sandbox purchase/restore/account-transfer/refund tests. No actual products or subscriptions created by this work. Free launch disables purchase. See APP_STORE_SUBSCRIPTION.md.


Status definitions: VERIFIED means a named automated/browser check passed; IMPLEMENTED / NOT DEVICE VERIFIED means code exists without physical-device evidence; EXTERNAL SETUP REQUIRED needs operator systems; NOT IMPLEMENTED means no working feature is claimed.
