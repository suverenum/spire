import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { WebSocketBanner } from "./websocket-banner";

afterEach(cleanup);

describe("WebSocketBanner", () => {
  it("renders nothing when connected", () => {
    const { container } = render(<WebSocketBanner isConnected={true} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows banner when disconnected", () => {
    render(<WebSocketBanner isConnected={false} />);
    expect(screen.getByText(/Live updates paused/)).toBeInTheDocument();
  });

  it("mentions polling interval", () => {
    render(<WebSocketBanner isConnected={false} />);
    expect(screen.getByText(/15 seconds/)).toBeInTheDocument();
  });
});
