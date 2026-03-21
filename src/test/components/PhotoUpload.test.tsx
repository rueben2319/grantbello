import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PhotoUpload } from "@/components/PhotoUpload";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: "https://example.com/photo.jpg" },
        }),
      }),
    },
  },
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("PhotoUpload", () => {
  const onUploaded = vi.fn();
  const onRemoved = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders upload button", () => {
    render(
      <PhotoUpload
        familyId="f1"
        onUploaded={onUploaded}
        onRemoved={onRemoved}
      />
    );
    expect(screen.getByText("Upload Photo")).toBeInTheDocument();
  });

  it("shows existing photo when currentUrl is provided", () => {
    render(
      <PhotoUpload
        familyId="f1"
        currentUrl="https://example.com/existing.jpg"
        onUploaded={onUploaded}
        onRemoved={onRemoved}
      />
    );
    const img = screen.getByAltText("Person");
    expect(img).toHaveAttribute("src", "https://example.com/existing.jpg");
  });

  it("calls onRemoved when remove button is clicked", () => {
    render(
      <PhotoUpload
        familyId="f1"
        currentUrl="https://example.com/existing.jpg"
        onUploaded={onUploaded}
        onRemoved={onRemoved}
      />
    );
    const removeBtn = screen.getByRole("button");
    fireEvent.click(removeBtn);
    expect(onRemoved).toHaveBeenCalled();
  });

  it("rejects files over 5MB", async () => {
    const { toast } = await import("@/lib/toast");

    render(
      <PhotoUpload
        familyId="f1"
        onUploaded={onUploaded}
        onRemoved={onRemoved}
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const largeFile = new File(["x".repeat(6 * 1024 * 1024)], "big.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(largeFile, "size", { value: 6 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Image must be under 5MB");
    });
  });
});
