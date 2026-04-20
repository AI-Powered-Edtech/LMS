import { beforeEach,describe, expect, it, vi } from "vitest";

import { getAuthProvider,setAuthProvider } from "@/services/auth/authProvider";
import type {
  AuthProvider,
  AuthSession,
  AuthUser,
} from "@/services/auth/types";

const createMockAuthProvider = (
  overrides?: Partial<AuthProvider>,
): AuthProvider => ({
  getSession: vi
    .fn()
    .mockResolvedValue({ data: { session: null }, error: null }),
  getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
  getAuthBootstrap: vi.fn().mockResolvedValue({ data: null, error: null }),
  onAuthStateChange: vi
    .fn()
    .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  switchTenant: vi
    .fn()
    .mockResolvedValue({ data: { session: null }, error: null }),
  signInWithPassword: vi
    .fn()
    .mockResolvedValue({ data: { session: null, user: null }, error: null }),
  signUp: vi
    .fn()
    .mockResolvedValue({ data: { session: null, user: null }, error: null }),
  signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  refreshSession: vi
    .fn()
    .mockResolvedValue({ data: { session: null }, error: null }),
  exchangeCodeForSession: vi
    .fn()
    .mockResolvedValue({ data: { session: null, user: null }, error: null }),
  verifyOtp: vi.fn().mockResolvedValue({ error: null }),
  resend: vi.fn().mockResolvedValue({ error: null }),
  resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
  updateUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
  mfa: {
    enroll: vi.fn(),
    challenge: vi.fn(),
    verify: vi.fn(),
    challengeAndVerify: vi.fn(),
    unenroll: vi.fn(),
    listFactors: vi.fn(),
    getAuthenticatorAssuranceLevel: vi.fn(),
  },
  ...overrides,
});

describe("authProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("setAuthProvider()", () => {
    it("sets the active auth provider", () => {
      const mockProvider = createMockAuthProvider();
      setAuthProvider(mockProvider);

      expect(getAuthProvider()).toBe(mockProvider);
    });

    it("allows replacing the auth provider", () => {
      const firstProvider = createMockAuthProvider({
        signInWithPassword: vi.fn(),
      });
      const secondProvider = createMockAuthProvider({
        signInWithPassword: vi.fn(),
      });

      setAuthProvider(firstProvider);
      expect(getAuthProvider()).toBe(firstProvider);

      setAuthProvider(secondProvider);
      expect(getAuthProvider()).toBe(secondProvider);
    });

    it("can be called with null to clear provider", () => {
      const mockProvider = createMockAuthProvider();
      setAuthProvider(mockProvider);
      setAuthProvider(null as never);

      expect(() => getAuthProvider()).toThrow("[AuthProvider] Not initialized");
    });
  });

  describe("getAuthProvider()", () => {
    it("throws error when provider is not initialized", () => {
      setAuthProvider(null as never);

      expect(() => getAuthProvider()).toThrow(
        "[AuthProvider] Not initialized. Call setAuthProvider() first.",
      );
    });

    it("returns the initialized provider", () => {
      const mockProvider = createMockAuthProvider();
      setAuthProvider(mockProvider);

      const result = getAuthProvider();

      expect(result).toBeDefined();
      expect(typeof result.getSession).toBe("function");
      expect(typeof result.signInWithPassword).toBe("function");
      expect(typeof result.signOut).toBe("function");
    });
  });

  describe("signInWithPassword()", () => {
    it("calls signInWithPassword with credentials", async () => {
      const mockSession: AuthSession = {
        access_token: "token123",
        refresh_token: "refresh123",
        user: { id: "usr_123", email: "test@example.com" },
      };
      const mockUser: AuthUser = { id: "usr_123", email: "test@example.com" };

      const mockProvider = createMockAuthProvider({
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { session: mockSession, user: mockUser },
          error: null,
        }),
      });

      setAuthProvider(mockProvider);
      const result = await getAuthProvider().signInWithPassword({
        email: "test@example.com",
        password: "password123",
      });

      expect(mockProvider.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.data?.session).toEqual(mockSession);
      expect(result.data?.user).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it("returns error when signInWithPassword fails", async () => {
      const mockProvider = createMockAuthProvider({
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { session: null, user: null },
          error: { message: "Invalid credentials", status: 401 },
        }),
      });

      setAuthProvider(mockProvider);
      const result = await getAuthProvider().signInWithPassword({
        email: "wrong@example.com",
        password: "wrongpassword",
      });

      expect(result.data?.session).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe("Invalid credentials");
    });

    it("handles network errors", async () => {
      const mockProvider = createMockAuthProvider({
        signInWithPassword: vi
          .fn()
          .mockRejectedValue(new Error("Network error")),
      });

      setAuthProvider(mockProvider);

      await expect(
        getAuthProvider().signInWithPassword({
          email: "test@test.com",
          password: "123",
        }),
      ).rejects.toThrow("Network error");
    });
  });

  describe("signOut()", () => {
    it("calls signOut successfully", async () => {
      const mockProvider = createMockAuthProvider({
        signOut: vi.fn().mockResolvedValue({ error: null }),
      });

      setAuthProvider(mockProvider);
      const result = await getAuthProvider().signOut();

      expect(mockProvider.signOut).toHaveBeenCalled();
      expect(result.error).toBeNull();
    });

    it("returns error when signOut fails", async () => {
      const mockProvider = createMockAuthProvider({
        signOut: vi.fn().mockResolvedValue({
          error: { message: "Failed to sign out", status: 500 },
        }),
      });

      setAuthProvider(mockProvider);
      const result = await getAuthProvider().signOut();

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe("Failed to sign out");
    });
  });

  describe("getSession()", () => {
    it("returns session when user is authenticated", async () => {
      const mockSession: AuthSession = {
        access_token: "token123",
        refresh_token: "refresh123",
        user: { id: "usr_123", email: "test@example.com" },
      };

      const mockProvider = createMockAuthProvider({
        getSession: vi.fn().mockResolvedValue({
          data: { session: mockSession },
          error: null,
        }),
      });

      setAuthProvider(mockProvider);
      const result = await getAuthProvider().getSession();

      expect(mockProvider.getSession).toHaveBeenCalled();
      expect(result.data?.session).toEqual(mockSession);
      expect(result.error).toBeNull();
    });

    it("returns null session when user is not authenticated", async () => {
      const mockProvider = createMockAuthProvider({
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
      });

      setAuthProvider(mockProvider);
      const result = await getAuthProvider().getSession();

      expect(result.data?.session).toBeNull();
      expect(result.error).toBeNull();
    });

    it("returns error when getSession fails", async () => {
      const mockProvider = createMockAuthProvider({
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: { message: "Session expired", status: 401 },
        }),
      });

      setAuthProvider(mockProvider);
      const result = await getAuthProvider().getSession();

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe("Session expired");
    });
  });

  describe("getUser()", () => {
    it("returns user data", async () => {
      const mockUser: AuthUser = { id: "usr_123", email: "test@example.com" };

      const mockProvider = createMockAuthProvider({
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      });

      setAuthProvider(mockProvider);
      const result = await getAuthProvider().getUser();

      expect(result.data?.user).toEqual(mockUser);
    });

    it("returns null user when not authenticated", async () => {
      const mockProvider = createMockAuthProvider({
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      });

      setAuthProvider(mockProvider);
      const result = await getAuthProvider().getUser();

      expect(result.data?.user).toBeNull();
    });
  });

  describe("onAuthStateChange()", () => {
    it("registers callback and returns unsubscribe", () => {
      const mockCallback = vi.fn();
      const mockSubscription = { unsubscribe: vi.fn() };

      const mockProvider = createMockAuthProvider({
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: mockSubscription },
        }),
      });

      setAuthProvider(mockProvider);
      const result = getAuthProvider().onAuthStateChange(mockCallback);

      expect(mockProvider.onAuthStateChange).toHaveBeenCalledWith(mockCallback);
      expect(result.data.subscription).toBeDefined();
    });
  });
});
