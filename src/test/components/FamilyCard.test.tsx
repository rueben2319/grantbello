import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FamilyCard } from "@/components/FamilyCard";
import type { Tables } from "@/integrations/supabase/types";

const baseFamily: Tables<"families"> = {
  id: "f1",
  name: "The Smiths",
  description: "A great family",
  is_public: true,
  created_by: "user-1",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("FamilyCard", () => {
  it("renders the family name", () => {
    render(<MemoryRouter><FamilyCard family={baseFamily} /></MemoryRouter>);
    expect(screen.getByText("The Smiths")).toBeInTheDocument();
  });

  it("renders the description when present", () => {
    render(<MemoryRouter><FamilyCard family={baseFamily} /></MemoryRouter>);
    expect(screen.getByText("A great family")).toBeInTheDocument();
  });

  it("shows Public badge for public families", () => {
    render(<MemoryRouter><FamilyCard family={baseFamily} /></MemoryRouter>);
    expect(screen.getByText("Public")).toBeInTheDocument();
  });

  it("shows Private badge for private families", () => {
    const privateFamily = { ...baseFamily, is_public: false };
    render(<MemoryRouter><FamilyCard family={privateFamily} /></MemoryRouter>);
    expect(screen.getByText("Private")).toBeInTheDocument();
  });

  it("shows role badge when showRole is true", () => {
    const familyWithRole = { ...baseFamily, role: "admin" };
    render(<MemoryRouter><FamilyCard family={familyWithRole} showRole /></MemoryRouter>);
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("links to the correct family URL", () => {
    render(<MemoryRouter><FamilyCard family={baseFamily} /></MemoryRouter>);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/family/f1");
  });
});
