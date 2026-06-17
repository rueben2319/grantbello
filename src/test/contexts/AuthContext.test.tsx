import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

vi.mock("@/integrations/supabase/client", () => {
  const mockSession = { user: { id: "u1", email: "a@b.com" } };
  const mockProfile = { display_name: "Alice", user_id: "u1" };
  const authListeners: Array<(event: string, session: unknown) => void> = [];
  return {
    supabase: {
      auth: {
        onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
          authListeners.push(cb);
          cb("SIGNED_IN", mockSession);
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        },
        getSession: vi.fn().mockResolvedValue({
          data: { session: mockSession },
        }),
      },
      from: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProfile }),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile }),
      }),
    },
  };
});

function TestConsumer() {
  const { user, profile } = useAuth();
  return (
    <>
      <span>{user ? "logged in" : "logged out"}</span>
      <span>{profile?.display_name ?? "no profile"}</span>
    </>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AuthProvider", () => {
  it("provides user and profile after session loads", async () => {
    await act(async () => {
      render(<AuthProvider><TestConsumer /></AuthProvider>);
    });
    expect(screen.getByText("logged in")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("throws when useAuth is used outside AuthProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      "useAuth must be used within AuthProvider"
    );
    spy.mockRestore();
  });
});
