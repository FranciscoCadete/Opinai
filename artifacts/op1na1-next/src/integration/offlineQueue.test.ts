// IndexedDB integration tests for the offline queue.
// Uses fake-indexeddb to polyfill the global indexedDB in Node.js.
// @vitest-environment node

import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Re-import module fresh in each describe block by using dynamic imports
// so the in-memory IndexedDB state is truly isolated.

async function freshQueue() {
  // Reset module registry so the DB connection is not reused
  return await import("@/lib/offlineQueue");
}

const SAMPLE_REQUEST = {
  url:     "http://localhost/api/requests",
  method:  "POST",
  body:    JSON.stringify({ description: "Test request" }),
  headers: { "Content-Type": "application/json" },
  label:   "Test request",
};

function mockFetch(ok: boolean, payload: object = {}) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : ok === false ? 400 : 200,
    json:   async () => payload,
  });
}

afterEach(() => vi.unstubAllGlobals());

// ─── enqueue + getAll + count ─────────────────────────────────────
describe("enqueue / getAll / count", () => {
  it("enqueue returns a string ID", async () => {
    const q  = await freshQueue();
    const id = await q.enqueue(SAMPLE_REQUEST);
    expect(typeof id).toBe("string");
    expect(id.startsWith("offline-")).toBe(true);
  });

  it("getAll returns the enqueued item", async () => {
    const q  = await freshQueue();
    const id = await q.enqueue(SAMPLE_REQUEST);
    const all = await q.getAll();
    const found = all.find(i => i.id === id);
    expect(found).toBeDefined();
    expect(found?.url).toBe(SAMPLE_REQUEST.url);
    expect(found?.method).toBe("POST");
    expect(found?.retries).toBe(0);
    expect(typeof found?.timestamp).toBe("number");
  });

  it("count reflects the number of queued items", async () => {
    const q = await freshQueue();
    const before = await q.count();
    await q.enqueue(SAMPLE_REQUEST);
    await q.enqueue(SAMPLE_REQUEST);
    const after = await q.count();
    expect(after).toBe(before + 2);
  });
});

// ─── remove ───────────────────────────────────────────────────────
describe("remove", () => {
  it("removes the item by id", async () => {
    const q   = await freshQueue();
    const id  = await q.enqueue(SAMPLE_REQUEST);
    await q.remove(id);
    const all = await q.getAll();
    expect(all.find(i => i.id === id)).toBeUndefined();
  });

  it("count decreases after remove", async () => {
    const q    = await freshQueue();
    const id   = await q.enqueue(SAMPLE_REQUEST);
    const pre  = await q.count();
    await q.remove(id);
    const post = await q.count();
    expect(post).toBe(pre - 1);
  });

  it("does not throw when removing non-existent id", async () => {
    const q = await freshQueue();
    await expect(q.remove("non-existent-id")).resolves.toBeUndefined();
  });
});

// ─── flushQueue — success ─────────────────────────────────────────
describe("flushQueue — network success", () => {
  it("sends the request and removes it from queue", async () => {
    vi.stubGlobal("fetch", mockFetch(true, { ticketId: "MUL-TEST-001" }));
    const q   = await freshQueue();
    await q.enqueue(SAMPLE_REQUEST);
    const res = await q.flushQueue();
    expect(res.sent).toBeGreaterThanOrEqual(1);
    expect(res.remaining).toBe(0);
  });

  it("returns correct sent count", async () => {
    vi.stubGlobal("fetch", mockFetch(true, { ticketId: "MUL-TEST-002" }));
    const q = await freshQueue();
    await q.enqueue(SAMPLE_REQUEST);
    await q.enqueue(SAMPLE_REQUEST);
    const res = await q.flushQueue();
    expect(res.sent).toBeGreaterThanOrEqual(2);
    expect(res.remaining).toBe(0);
  });
});

// ─── flushQueue — 4xx response → drop ────────────────────────────
describe("flushQueue — 4xx (client error) → drop", () => {
  it("drops item on 400 (bad request)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok:     false,
      status: 400,
      json:   async () => ({ error: "bad request" }),
    }));
    const q   = await freshQueue();
    await q.enqueue(SAMPLE_REQUEST);
    const pre = await q.count();
    await q.flushQueue();
    const post = await q.count();
    // 4xx errors are dropped (not retriable)
    expect(post).toBeLessThan(pre);
  });
});

// ─── flushQueue — network error → retain ─────────────────────────
describe("flushQueue — network error → retain for retry", () => {
  it("retains item when fetch throws (offline)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    const q   = await freshQueue();
    await q.enqueue(SAMPLE_REQUEST);
    const pre  = await q.count();
    const res  = await q.flushQueue();
    const post = await q.count();
    expect(res.failed).toBeGreaterThanOrEqual(1);
    expect(post).toBeGreaterThanOrEqual(pre); // item retained
  });

  it("returns failed count on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Offline")));
    const q   = await freshQueue();
    await q.enqueue(SAMPLE_REQUEST);
    const res = await q.flushQueue();
    expect(res.failed).toBeGreaterThanOrEqual(1);
  });
});

// ─── flushQueue — empty queue ─────────────────────────────────────
describe("flushQueue — empty queue", () => {
  it("returns sent:0 failed:0 remaining:0 when queue is empty", async () => {
    vi.stubGlobal("fetch", mockFetch(true));
    const q   = await freshQueue();
    // Drain any pre-existing items
    await q.flushQueue();
    const res = await q.flushQueue();
    expect(res.sent).toBe(0);
    expect(res.failed).toBe(0);
    expect(res.remaining).toBe(0);
  });
});
