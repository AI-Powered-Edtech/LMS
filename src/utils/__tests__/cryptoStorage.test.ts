import { describe, expect,it } from "vitest";

import { decryptData,encryptData } from "../cryptoStorage";

describe("cryptoStorage", () => {
  it("should encrypt and decrypt a string", async () => {
    const data = "hello world";
    const userId = "user123";
    const encrypted = await encryptData(data, userId);
    const decrypted = await decryptData<string>(encrypted, userId);
    expect(decrypted).toBe(data);
  });

  it("should encrypt and decrypt an object", async () => {
    const data = { foo: "bar", baz: 123 };
    const userId = "user456";
    const encrypted = await encryptData(data, userId);
    const decrypted = await decryptData<typeof data>(encrypted, userId);
    expect(decrypted).toEqual(data);
  });

  it("should return different ciphertexts for the same data and userId (random IV)", async () => {
    const data = "secret";
    const userId = "user789";
    const encrypted1 = await encryptData(data, userId);
    const encrypted2 = await encryptData(data, userId);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it("should fail to decrypt with the wrong userId", async () => {
    const data = "top secret";
    const userId1 = "userA";
    const userId2 = "userB";
    const encrypted = await encryptData(data, userId1);
    await expect(decryptData(encrypted, userId2)).rejects.toThrow();
  });

  it("should fail to decrypt corrupt data", async () => {
    const data = "top secret";
    const userId = "userC";
    const encrypted = await encryptData(data, userId);

    // Corrupt the data by changing a character
    const corruptEncrypted =
      encrypted.substring(0, encrypted.length - 1) +
      (encrypted.endsWith("a") ? "b" : "a");
    await expect(decryptData(corruptEncrypted, userId)).rejects.toThrow();
  });
});
