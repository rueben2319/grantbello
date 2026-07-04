import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { forwardRef, useImperativeHandle } from "react";
import FamilyTree from "@/pages/FamilyTree";

const mockUseFamily = vi.fn();
const mockUseFamilyPersons = vi.fn();
const mockUseFamilyRelationships = vi.fn();
const mockUseUserFamilyRole = vi.fn();
const mockUseAuth = vi.fn();
const mockUseIsMobile = vi.fn();

vi.mock("@/hooks/useFamily", () => ({
  useFamily: () => mockUseFamily(),
  useFamilyPersons: () => mockUseFamilyPersons(),
  useFamilyRelationships: () => mockUseFamilyRelationships(),
  useUserFamilyRole: () => mockUseUserFamilyRole(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

vi.mock("@/components/TreeVisualization", () => ({
  TreeVisualization: forwardRef(function TreeVisualization(props: any, ref: any) {
    useImperativeHandle(ref, () => ({
      focusPerson: vi.fn(),
      focusPersons: vi.fn(),
    }));
    return (
      <div
        data-testid="tree-visualization"
        data-highlighted-id={props.highlightedPersonIds ? Array.from(props.highlightedPersonIds).join(",") : ""}
      />
    );
  }),
}));

vi.mock("@/components/PersonProfileCard", () => ({
  PersonProfileCard: () => null,
}));

vi.mock("@/components/AddPersonDialog", () => ({
  AddPersonDialog: () => null,
}));

vi.mock("@/components/FamilySettingsDialog", () => ({
  FamilySettingsDialog: () => null,
}));

vi.mock("@/components/MemberManagement", () => ({
  MemberManagement: () => null,
}));

vi.mock("@/components/BranchList", () => ({
  BranchList: () => null,
}));

vi.mock("@/components/Navbar", () => ({
  Navbar: () => <div data-testid="navbar" />,
}));

vi.mock("@/components/ErrorBoundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("FamilyTree generation filter", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: { id: "u1" } });
    mockUseIsMobile.mockReturnValue(false);
    mockUseUserFamilyRole.mockReturnValue({ data: "admin" });
    mockUseFamily.mockReturnValue({ data: { id: "f1", name: "Test Family" }, isLoading: false });
    mockUseFamilyPersons.mockReturnValue({ data: [
      { id: "person-1", first_name: "Root", last_name: "Person", birth_date: "1900-01-01", married_in: false, created_at: "1900-01-01T00:00:00Z" },
      { id: "person-2", first_name: "Child", last_name: "Person", birth_date: "1920-01-01", married_in: false, created_at: "1900-01-02T00:00:00Z" },
    ] });
    mockUseFamilyRelationships.mockReturnValue({ data: [
      { id: "r1", person_id: "person-1", related_person_id: "person-2", relationship_type: "parent" },
    ] });
  });

  it("passes the selected generation to the tree visualization", () => {
    render(
      <MemoryRouter initialEntries={["/family/f1"]}>
        <Routes>
          <Route path="/family/:familyId" element={<FamilyTree />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Gen 1" }));

    expect(screen.getByTestId("tree-visualization")).toHaveAttribute("data-highlighted-id", "person-1");
  });
});
