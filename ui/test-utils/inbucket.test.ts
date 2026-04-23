import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearMailbox,
  extractFirstUrlFromEmail,
  getLatestEmail,
  getMailboxMessages,
  getPasswordResetLink,
  type InbucketMessage,
} from "../e2e/helpers/inbucket";

function createFetchResponse(payload: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: async () => payload,
  } as Response;
}

describe("inbucket helper", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getMailboxMessages uses default Inbucket URL and mailbox local part", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(createFetchResponse([{ id: "msg-1" }]) as never);

    await getMailboxMessages("reset@enterprise.dev");

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:55334/api/v1/mailbox/reset");
  });

  it("clearMailbox issues DELETE request to mailbox endpoint", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(createFetchResponse({}, true, 200) as never);

    await clearMailbox("reset@enterprise.dev");

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:55334/api/v1/mailbox/reset", {
      method: "DELETE",
    });
  });

  it("getLatestEmail chooses the newest mailbox message", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        createFetchResponse([
          {
            mailbox: "reset",
            id: "older-message",
            from: "noreply@example.com",
            subject: "Reset",
            date: "2024-01-01T00:00:00.000Z",
            size: 100,
          },
          {
            mailbox: "reset",
            id: "newer-message",
            from: "noreply@example.com",
            subject: "Reset",
            date: "2024-01-01T00:01:00.000Z",
            size: 100,
          },
        ]),
      )
      .mockResolvedValueOnce(
        createFetchResponse({
          mailbox: "reset",
          id: "newer-message",
          subject: "Reset",
          from: "noreply@example.com",
          to: ["reset@enterprise.dev"],
          date: "2024-01-01T00:01:00.000Z",
          body: { text: "Go here: http://localhost:3000/reset-password" },
        }),
      );

    const message = await getLatestEmail("reset@enterprise.dev", {
      baseUrl: "http://localhost:55334",
      timeoutMs: 2_000,
      pollIntervalMs: 10,
    });

    expect(message.id).toBe("newer-message");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:55334/api/v1/mailbox/reset/newer-message",
    );
  });

  it("extractFirstUrlFromEmail throws when no URL is found", () => {
    const message: InbucketMessage = {
      mailbox: "reset",
      id: "msg-no-url",
      subject: "Reset",
      from: "noreply@example.com",
      to: ["reset@enterprise.dev"],
      date: "2024-01-01T00:00:00.000Z",
      body: { text: "No link here" },
    };

    expect(() => extractFirstUrlFromEmail(message)).toThrow(
      "Could not find a URL in Inbucket email content",
    );
  });

  it("getPasswordResetLink returns first URL from latest email", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        createFetchResponse([
          {
            mailbox: "reset",
            id: "msg-1",
            from: "noreply@example.com",
            subject: "Reset",
            date: "2024-01-01T00:00:00.000Z",
            size: 100,
          },
        ]),
      )
      .mockResolvedValueOnce(
        createFetchResponse({
          mailbox: "reset",
          id: "msg-1",
          subject: "Reset",
          from: "noreply@example.com",
          to: ["reset@enterprise.dev"],
          date: "2024-01-01T00:00:00.000Z",
          body: {
            text: "Reset URL: http://localhost:3000/reset-password?token=abc",
          },
        }),
      );

    const link = await getPasswordResetLink("reset@enterprise.dev");

    expect(link).toBe("http://localhost:3000/reset-password?token=abc");
  });

  it("throws descriptive timeout error when no email is found in time", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(createFetchResponse([]) as never);

    await expect(
      getLatestEmail("reset@enterprise.dev", {
        timeoutMs: 1,
        pollIntervalMs: 1,
      }),
    ).rejects.toThrow("Timed out waiting for Inbucket email for reset@enterprise.dev after 1ms");
  });
});
