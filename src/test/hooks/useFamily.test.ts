import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

const mockFrom = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mockFrom },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-123" }, loading: false }),
}));

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

function mockSupabaseChain(resolvedValue: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(resolvedValue),
    single: vi.fn().mockResolvedValue(resolvedValue),
    in: vi.fn().mockResolvedValue(resolvedValue),
  };
  mockFrom.mockReturnValue(chain);
  return chain;
}

describe("useFamilyPersons", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns persons array on success", async () => {
    const { useFamilyPersons } = await import("@/hooks/useFamily");
    const fakePersons = [{ id: "p1", first_name: "Alice", family_id: "f1" }];
    const chain = mockSupabaseChain({ data: fakePersons, error: null });
    chain.order.mockResolvedValue({ data: fakePersons, error: null });

    const { result } = renderHook(() => useFamilyPersons("f1"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(fakePersons);
  });

  it("throws when supabase returns an error", async () => {
    const { useFamilyPersons } = await import("@/hooks/useFamily");
    const chain = mockSupabaseChain({ data: null, error: { message: "DB error" } });
    chain.order.mockResolvedValue({ data: null, error: { message: "DB error" } });

    const { result } = renderHook(() => useFamilyPersons("f1"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe("DB error");
  });

  it("does not fetch when familyId is undefined", async () => {
    const { useFamilyPersons } = await import("@/hooks/useFamily");
    mockSupabaseChain({ data: [], error: null });

    const { result } = renderHook(() => useFamilyPersons(undefined), {
      wrapper: makeWrapper(),
    });

    expect(result.current.isPending).toBe(true);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("useFamily", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns family data on success", async () => {
    const { useFamily } = await import("@/hooks/useFamily");
    const fakeFamily = { id: "f1", name: "Smiths", is_public: true };
    mockSupabaseChain({ data: fakeFamily, error: null });

    const { result } = renderHook(() => useFamily("f1"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(fakeFamily);
  });

  it("errors when family not found", async () => {
    const { useFamily } = await import("@/hooks/useFamily");
    mockSupabaseChain({ data: null, error: { message: "Not found" } });

    const { result } = renderHook(() => useFamily("missing"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
