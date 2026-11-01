# Whish official docs go here

Put the merchant API documentation you receive from Whish in this folder (PDF, markdown or text).

The payment tasks (P2-01 onward) read this folder before writing the real Whish provider. If it is
empty when those tasks start, Claude Code stops and asks you for it rather than guessing endpoint
paths, header names or callback formats from community libraries.

What to ask Whish's business team for:

- Merchant API documentation (create payment, payment status, callbacks, fees)
- Sandbox credentials: channel ID, secret, registered website URL
- Whether a refund API or recurring billing exists
- How callback authenticity is guaranteed (signature, IP allowlist, or status lookup only)
