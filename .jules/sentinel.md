## 2024-05-24 - [Insecure Randomness for Join Codes]
**Vulnerability:** Found `Math.random()` being used to generate classroom join codes (`Math.random().toString(36)...`).
**Learning:** `Math.random()` is not cryptographically secure and predictable. Its sequence can be inferred, meaning an attacker could potentially guess or bruteforce upcoming join codes, thereby bypassing access controls for joining classes.
**Prevention:** Always use `globalThis.crypto.getRandomValues()` or `globalThis.crypto.randomUUID()` when generating unique identifiers, tokens, join codes, or other sensitive secrets in the application to ensure cryptographic randomness.
