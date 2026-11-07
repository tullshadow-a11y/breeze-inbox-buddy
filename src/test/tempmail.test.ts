import { describe, expect, it } from "vitest";

import { isProviderWelcome } from "@/lib/tempmail";

const base = { mail_subject: "Hi", mail_timestamp: "0", mail_read: "0" };

describe("inbox shows only real incoming mail", () => {
  it("hides the provider's canned welcome note", () => {
    expect(
      isProviderWelcome({ ...base, mail_id: 1, mail_from: "no-reply@guerrillamail.com" }),
    ).toBe(true);
  });

  it("keeps messages from real senders", () => {
    expect(isProviderWelcome({ ...base, mail_id: "84721", mail_from: "Acme <hello@acme.io>" })).toBe(
      false,
    );
  });
});
