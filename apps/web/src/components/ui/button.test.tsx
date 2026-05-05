import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("renders as a non-submitting button by default", () => {
    render(<Button>Créer promo</Button>);

    const button = screen.getByRole("button", { name: "Créer promo" });
    expect(button.getAttribute("type")).toBe("button");
  });

  it("preserves caller-provided button type", () => {
    render(<Button type="submit">Envoyer</Button>);

    expect(screen.getByRole("button", { name: "Envoyer" }).getAttribute("type")).toBe("submit");
  });
});
