import { beforeEach, describe, expect, it, vi } from "vitest";
import { app, ipcMain } from "electron";
import { initialize, trackEvent } from "@aptabase/electron/main";
import log from "electron-log/main";
import store, { getAnalyticsEnabled, setAnalyticsEnabled } from "@main/services/storeService";
import { trackAppStartup } from "@main/services/analyticsService";
import { registerAnalyticsHandlers } from "@main/handlers/analyticsHandlers";

vi.mock("electron", () => ({ app: { isPackaged: true }, ipcMain: { handle: vi.fn() } }));
vi.mock("@aptabase/electron/main", () => ({ initialize: vi.fn(), trackEvent: vi.fn() }));
vi.mock("electron-log/main", () => ({ default: { warn: vi.fn() } }));
vi.mock("electron-store", () => ({
  default: class {
    private values = new Map<string, unknown>();
    get(key: string, fallback?: unknown) {
      return this.values.has(key) ? this.values.get(key) : fallback;
    }
    set(key: string, value: unknown) {
      this.values.set(key, value);
    }
    clear() {
      this.values.clear();
    }
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  store.clear();
  Object.defineProperty(app, "isPackaged", { value: true, configurable: true });
});

describe("startup analytics", () => {
  it("defaults to enabled and sends only the startup event in packaged apps", async () => {
    expect(getAnalyticsEnabled()).toBe(true);
    await trackAppStartup();
    expect(initialize).toHaveBeenCalledExactlyOnceWith("A-US-5250663172");
    expect(trackEvent).toHaveBeenCalledExactlyOnceWith("app_started");
  });

  it("never initializes or tracks in an unpackaged app, even with statistics enabled", async () => {
    Object.defineProperty(app, "isPackaged", { value: false });
    setAnalyticsEnabled(true);
    await trackAppStartup();
    expect(initialize).not.toHaveBeenCalled();
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("reads the saved opt-out before initializing the SDK", async () => {
    setAnalyticsEnabled(false);
    await trackAppStartup();
    expect(initialize).not.toHaveBeenCalled();
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("initializes immediately but waits for the SDK before sending", async () => {
    let ready!: () => void;
    vi.mocked(initialize).mockReturnValue(new Promise<void>((resolve) => (ready = resolve)));
    const startup = trackAppStartup();
    expect(initialize).toHaveBeenCalledOnce();
    expect(trackEvent).not.toHaveBeenCalled();
    ready();
    await startup;
    expect(trackEvent).toHaveBeenCalledExactlyOnceWith("app_started");
  });

  it("uses the launch preference so changes during initialization apply on the next launch", async () => {
    let ready!: () => void;
    vi.mocked(initialize).mockReturnValue(new Promise<void>((resolve) => (ready = resolve)));
    const startup = trackAppStartup();
    setAnalyticsEnabled(false);
    ready();
    await startup;
    expect(trackEvent).toHaveBeenCalledExactlyOnceWith("app_started");
  });

  it("does not send an extra event when statistics are enabled again", async () => {
    await trackAppStartup();
    setAnalyticsEnabled(false);
    setAnalyticsEnabled(true);
    expect(trackEvent).toHaveBeenCalledExactlyOnceWith("app_started");
  });

  it("contains initialization failures without rejecting app startup", async () => {
    vi.mocked(initialize).mockRejectedValue(new Error("SDK unavailable"));
    await expect(trackAppStartup()).resolves.toBeUndefined();
    expect(trackEvent).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalledOnce();
  });

  it("contains tracking failures without rejecting app startup", async () => {
    vi.mocked(trackEvent).mockRejectedValue(new Error("Offline"));
    await expect(trackAppStartup()).resolves.toBeUndefined();
    expect(log.warn).toHaveBeenCalledOnce();
  });
});

describe("analytics preference IPC", () => {
  const handlers = () => {
    registerAnalyticsHandlers();
    const calls = vi.mocked(ipcMain.handle).mock.calls;
    return {
      get: calls.find(([channel]) => channel === "get-analytics-enabled")![1],
      set: calls.find(([channel]) => channel === "set-analytics-enabled")![1],
    };
  };

  it("persists opt-out and opt-in without tracking a settings change", () => {
    const { get, set } = handlers();
    const event = {} as Electron.IpcMainInvokeEvent;
    expect(get(event)).toBe(true);
    set(event, false);
    expect(store.get("analyticsEnabled")).toBe(false);
    expect(get(event)).toBe(false);
    set(event, true);
    expect(get(event)).toBe(true);
    expect(initialize).not.toHaveBeenCalled();
    expect(trackEvent).not.toHaveBeenCalled();
  });
});
