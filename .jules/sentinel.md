## 2025-02-18 - [MEDIUM] Insecure Randomness for Join Codes
**Vulnerability:** Classroom join codes were generated using the predictable `Math.random()` function.
**Learning:** `Math.random()` is not cryptographically secure, allowing attackers to potentially predict join codes and gain unauthorized access to classrooms.
**Prevention:** Always use `globalThis.crypto.getRandomValues` or `crypto.randomUUID()` for generating security tokens, join codes, or any unique identifiers that shouldn't be easily guessable.
