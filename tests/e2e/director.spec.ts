import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";

test("a director cue reaches another performer", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", {
    storagePrefix: "mesh-improv-director",
  });
  try {
    await a.getByRole("textbox", { name: "Your rehearsal name" }).fill("Ari");
    await b.getByRole("textbox", { name: "Your rehearsal name" }).fill("Bea");
    await a
      .getByRole("textbox", { name: "Premise", exact: true })
      .fill("The mayor's portrait has started giving directions.");
    await a
      .getByRole("textbox", { name: "Direction", exact: true })
      .fill("Treat the portrait as a respected colleague.");
    await a.getByRole("button", { name: "Add cue and direct it" }).click();
    await expect(
      b.getByRole("heading", { name: "The mayor's portrait has started giving directions." }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      b
        .getByRole("region", { name: "The mayor's portrait has started giving directions." })
        .getByText("Treat the portrait as a respected colleague."),
    ).toBeVisible();
    await b.getByRole("button", { name: "Clear stage" }).click();
    await expect(a.getByRole("heading", { name: "The stage is open" })).toBeVisible({
      timeout: 10_000,
    });
  } finally {
    await cleanup();
  }
});
