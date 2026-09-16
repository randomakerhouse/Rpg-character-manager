import { describe, expect, it } from "vitest";
import { isNewer, reconcile, type Stamped } from "../src/cloud/syncEngine.js";

interface Item extends Stamped {
  value: string;
}

describe("isNewer", () => {
  it("treats a later ISO timestamp as newer", () => {
    expect(isNewer({ id: "a", updatedAt: "2024-02-01T00:00:00Z" }, { id: "a", updatedAt: "2024-01-01T00:00:00Z" })).toBe(true);
  });

  it("treats a missing timestamp as oldest", () => {
    expect(isNewer({ id: "a", updatedAt: undefined }, { id: "a", updatedAt: "2024-01-01T00:00:00Z" })).toBe(false);
    expect(isNewer({ id: "a", updatedAt: "2024-01-01T00:00:00Z" }, { id: "a", updatedAt: undefined })).toBe(true);
  });
});

describe("reconcile (last-write-wins merge, section: cloud sync)", () => {
  it("pushes a record that only exists locally", async () => {
    const pushed: Item[] = [];
    const pulled: Item[] = [];
    await reconcile<Item>(
      [{ id: "1", value: "local-only", updatedAt: "2024-01-01T00:00:00Z" }],
      [],
      async (item) => void pushed.push(item),
      async (item) => void pulled.push(item),
    );
    expect(pushed).toHaveLength(1);
    expect(pulled).toHaveLength(0);
  });

  it("pulls a record that only exists remotely", async () => {
    const pushed: Item[] = [];
    const pulled: Item[] = [];
    await reconcile<Item>(
      [],
      [{ id: "1", value: "remote-only", updatedAt: "2024-01-01T00:00:00Z" }],
      async (item) => void pushed.push(item),
      async (item) => void pulled.push(item),
    );
    expect(pulled).toHaveLength(1);
    expect(pushed).toHaveLength(0);
  });

  it("keeps the newer of two conflicting copies and writes it to the older side", async () => {
    const pushed: Item[] = [];
    const pulled: Item[] = [];
    await reconcile<Item>(
      [{ id: "1", value: "newer-local", updatedAt: "2024-06-01T00:00:00Z" }],
      [{ id: "1", value: "older-remote", updatedAt: "2024-01-01T00:00:00Z" }],
      async (item) => void pushed.push(item),
      async (item) => void pulled.push(item),
    );
    expect(pushed).toEqual([{ id: "1", value: "newer-local", updatedAt: "2024-06-01T00:00:00Z" }]);
    expect(pulled).toHaveLength(0);
  });

  it("does nothing when both sides already match", async () => {
    const pushed: Item[] = [];
    const pulled: Item[] = [];
    const item = { id: "1", value: "same", updatedAt: "2024-01-01T00:00:00Z" };
    await reconcile<Item>([item], [item], async (i) => void pushed.push(i), async (i) => void pulled.push(i));
    expect(pushed).toHaveLength(0);
    expect(pulled).toHaveLength(0);
  });

  it("handles many records independently in one pass", async () => {
    const pushed: string[] = [];
    const pulled: string[] = [];
    await reconcile<Item>(
      [
        { id: "local-only", value: "a", updatedAt: "2024-01-01T00:00:00Z" },
        { id: "newer-local", value: "b", updatedAt: "2024-06-01T00:00:00Z" },
      ],
      [
        { id: "remote-only", value: "c", updatedAt: "2024-01-01T00:00:00Z" },
        { id: "newer-local", value: "b-old", updatedAt: "2024-01-01T00:00:00Z" },
      ],
      async (i) => void pushed.push(i.id),
      async (i) => void pulled.push(i.id),
    );
    expect(pushed.sort()).toEqual(["local-only", "newer-local"]);
    expect(pulled).toEqual(["remote-only"]);
  });
});
