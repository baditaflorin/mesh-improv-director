import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMockRoom } from "@baditaflorin/mesh-common/testing";
import { Feature, isValidCue, isValidDirection } from "../../src/Feature";
import { config } from "../../src/config";

describe("Feature (component)", () => {
  it("renders the shared stage when connected", () => {
    const room = createMockRoom();
    render(<Feature room={room} config={config} />);
    expect(screen.getByRole("heading", { name: "Improv Director" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "The stage is open" })).toBeInTheDocument();
    expect(document.querySelector(".director-launch")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Launch actions" })).toBeInTheDocument();
  });

  it("shows a connecting state when room is null", () => {
    render(<Feature room={null} config={config} />);
    expect(screen.getByText(/connecting to the rehearsal room/i)).toBeInTheDocument();
    expect(screen.getByText(/stage remains visible/i)).toBeInTheDocument();
  });

  it("accepts only bounded cue and direction records", () => {
    expect(
      isValidCue({
        id: "cue-123456789012",
        premise: "A surprising visitor arrives",
        instruction: "Name the relationship.",
        createdAt: 1,
        author: "Ari",
      }),
    ).toBe(true);
    expect(
      isValidCue({ id: "short", premise: "No", instruction: "No", createdAt: 1, author: "" }),
    ).toBe(false);
    expect(
      isValidDirection({
        id: "direction-123456",
        cueId: null,
        action: "clear",
        at: 1,
        author: "Ari",
      }),
    ).toBe(true);
    expect(
      isValidDirection({
        id: "direction-123456",
        cueId: "x",
        action: "other",
        at: Number.NaN,
        author: "Ari",
      }),
    ).toBe(false);
  });
});
