import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/contexts/AuthContext";
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

describe("ProtectedRoute", () => {
  it("shows spinner while loading", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(
      <MemoryRouter>
        <ProtectedRoute><span>Content</span></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });

  it("redirects to /auth when not authenticated", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <ProtectedRoute><span>Secret</span></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    mockUseAuth.mockReturnValue({ user: { id: "u1" }, loading: false });
    render(
      <MemoryRouter>
        <ProtectedRoute><span>Content</span></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
  });
});
