import { describe, expect, it, vi, beforeEach } from "vitest";
import { db } from "@/services/db";
import * as runtime from "@/services/api/runtime";
import * as authModule from "@/services/auth";
import * as realtimeModule from "@/services/realtime";
import * as storageModule from "@/services/storage";

vi.mock("@/services/api/runtime", () => ({
  getActiveApiClient: vi.fn(),
}));

vi.mock("@/services/auth", () => ({
  getAuthProvider: vi.fn(() => ({
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  })),
  setAuthProvider: vi.fn(),
}));

vi.mock("@/services/realtime", () => ({
  getRealtimeProvider: vi.fn(() => ({
    channel: vi.fn(),
    removeChannel: vi.fn(),
    removeAllChannels: vi.fn(),
  })),
}));

vi.mock("@/services/storage", () => ({
  getStorageProvider: vi.fn(() => ({
    from: vi.fn(),
  })),
}));

vi.mock("@/utils/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("db facade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("db.from()", () => {
    it("returns ApiQueryBuilder when client is initialized", () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn(),
      };

      vi.mocked(runtime.getActiveApiClient).mockReturnValue({
        from: vi.fn().mockReturnValue(mockQueryBuilder),
      } as never);

      const result = db.from("users");

      expect(runtime.getActiveApiClient).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("returns ApiQueryBuilder with correct table name", () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        then: vi.fn(),
      });

      vi.mocked(runtime.getActiveApiClient).mockReturnValue({
        from: mockFrom,
      } as never);

      db.from("courses");

      expect(mockFrom).toHaveBeenCalledWith("courses");
    });

    it("throws error when client is not initialized", () => {
      vi.mocked(runtime.getActiveApiClient).mockReturnValue(null);

      expect(() => db.from("users")).toThrow(
        "[VIL] API client not initialized. Call setActiveApiClient() before using db.from('users').",
      );
    });

    it("throws specific error for table name in error message", () => {
      vi.mocked(runtime.getActiveApiClient).mockReturnValue(null);

      expect(() => db.from("students")).toThrow("db.from('students')");
    });

    it("works with different table names", () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        then: vi.fn(),
      });

      vi.mocked(runtime.getActiveApiClient).mockReturnValue({
        from: mockFrom,
      } as never);

      const tables = ["users", "courses", "enrollments", "assignments"];
      tables.forEach((table) => {
        db.from(table);
        expect(mockFrom).toHaveBeenCalledWith(table);
      });
    });
  });

  describe("db.rpc()", () => {
    it("calls client.rpc with correct function name", async () => {
      const mockRpc = vi
        .fn()
        .mockResolvedValue({ data: { result: "ok" }, error: null });

      vi.mocked(runtime.getActiveApiClient).mockReturnValue({
        rpc: mockRpc,
      } as never);

      await db.rpc("get_user_profile", { user_id: "123" });

      expect(mockRpc).toHaveBeenCalledWith("get_user_profile", {
        user_id: "123",
      });
    });

    it("calls client.rpc with empty args when not provided", async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });

      vi.mocked(runtime.getActiveApiClient).mockReturnValue({
        rpc: mockRpc,
      } as never);

      await db.rpc("some_function");

      expect(mockRpc).toHaveBeenCalledWith("some_function", undefined);
    });

    it("returns ApiQueryResult with data when successful", async () => {
      const mockResult = { data: { count: 5 }, error: null };
      const mockRpc = vi.fn().mockResolvedValue(mockResult);

      vi.mocked(runtime.getActiveApiClient).mockReturnValue({
        rpc: mockRpc,
      } as never);

      const result = await db.rpc("count_records");

      expect(result).toEqual(mockResult);
    });

    it("returns ApiQueryResult with error when failed", async () => {
      const mockError = { message: "Function not found", code: "P0001" };
      const mockResult = { data: null, error: mockError };
      const mockRpc = vi.fn().mockResolvedValue(mockResult);

      vi.mocked(runtime.getActiveApiClient).mockReturnValue({
        rpc: mockRpc,
      } as never);

      const result = await db.rpc("invalid_function");

      expect(result).toEqual(mockResult);
    });

    it("throws error when client is not initialized", () => {
      vi.mocked(runtime.getActiveApiClient).mockReturnValue(null);

      expect(() => db.rpc("some_function")).toThrow(
        "[VIL] API client not initialized. Call setActiveApiClient() before using db.rpc('some_function').",
      );
    });

    it("throws specific error for function name in error message", () => {
      vi.mocked(runtime.getActiveApiClient).mockReturnValue(null);

      expect(() => db.rpc("my_function")).toThrow("db.rpc('my_function')");
    });
  });

  describe("db.auth", () => {
    it("returns auth provider from getAuthProvider", () => {
      const mockAuthProvider = {
        getSession: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
      };

      vi.mocked(authModule.getAuthProvider).mockReturnValue(
        mockAuthProvider as never,
      );

      const result = db.auth;
      expect(result).toBe(mockAuthProvider);
      expect(authModule.getAuthProvider).toHaveBeenCalled();
    });
  });

  describe("db.storage", () => {
    it("returns storage provider from getStorageProvider", () => {
      const mockStorageProvider = {
        from: vi.fn(),
      };

      vi.mocked(storageModule.getStorageProvider).mockReturnValue(
        mockStorageProvider as never,
      );

      const result = db.storage;
      expect(result).toBe(mockStorageProvider);
      expect(storageModule.getStorageProvider).toHaveBeenCalled();
    });
  });

  describe("db.channel()", () => {
    it("creates a realtime channel", () => {
      const mockChannel = { name: "test-channel" };
      const mockRealtimeProvider = {
        channel: vi.fn().mockReturnValue(mockChannel),
        removeChannel: vi.fn(),
        removeAllChannels: vi.fn(),
      };

      vi.mocked(realtimeModule.getRealtimeProvider).mockReturnValue(
        mockRealtimeProvider as never,
      );

      const result = db.channel("test-channel");

      expect(mockRealtimeProvider.channel).toHaveBeenCalledWith(
        "test-channel",
        undefined,
      );
      expect(result).toBe(mockChannel);
    });

    it("creates a realtime channel with options", () => {
      const mockChannel = { name: "test-channel" };
      const mockOptions = { config: { presence: { key: "test" } } };
      const mockRealtimeProvider = {
        channel: vi.fn().mockReturnValue(mockChannel),
        removeChannel: vi.fn(),
        removeAllChannels: vi.fn(),
      };

      vi.mocked(realtimeModule.getRealtimeProvider).mockReturnValue(
        mockRealtimeProvider as never,
      );

      db.channel("test-channel", mockOptions);

      expect(mockRealtimeProvider.channel).toHaveBeenCalledWith(
        "test-channel",
        mockOptions,
      );
    });

    it("removes a channel", () => {
      const mockChannel = {
        name: "test-channel",
        on: vi.fn(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        send: vi.fn(),
        track: vi.fn(),
        untrack: vi.fn(),
        presenceState: vi.fn().mockReturnValue({}),
      };
      const mockRealtimeProvider = {
        channel: vi.fn().mockReturnValue(mockChannel),
        removeChannel: vi.fn(),
        removeAllChannels: vi.fn(),
      };

      vi.mocked(realtimeModule.getRealtimeProvider).mockReturnValue(
        mockRealtimeProvider as never,
      );

      db.removeChannel(mockChannel);

      expect(mockRealtimeProvider.removeChannel).toHaveBeenCalledWith(
        mockChannel,
      );
    });

    it("removes all channels", () => {
      const mockRealtimeProvider = {
        channel: vi.fn(),
        removeChannel: vi.fn(),
        removeAllChannels: vi.fn(),
      };

      vi.mocked(realtimeModule.getRealtimeProvider).mockReturnValue(
        mockRealtimeProvider as never,
      );

      db.removeAllChannels();

      expect(mockRealtimeProvider.removeAllChannels).toHaveBeenCalled();
    });
  });

  describe("db.functions.invoke()", () => {
    it("returns error for removed edge functions", async () => {
      const result = await db.functions.invoke("my_function");

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("removed");
      expect(result.data).toBeNull();
    });

    it("returns error with function name in message", async () => {
      const result = await db.functions.invoke("custom_function");

      expect(result.error?.message).toContain("custom_function");
    });
  });
});
