import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Notices } from "./Notices.tsx";

const render = (canSave: boolean, removedStops: number) =>
  renderToStaticMarkup(
    <Notices
      canSave={canSave}
      removedStops={removedStops}
      onDismissRemoved={() => {}}
    />,
  );

describe("<Notices>", () => {
  it("shows nothing when all is well", () => {
    expect(render(true, 0)).toBe("");
  });

  it("warns that the trip can't be saved", () => {
    expect(render(false, 0)).toContain(
      "This browser can&#x27;t save your trip. It will be lost when you close this tab.",
    );
  });

  it("says how many saved Stops were removed, in the right number", () => {
    expect(render(true, 1)).toContain(
      "1 Stop no longer exists and was removed.",
    );
    expect(render(true, 2)).toContain(
      "2 Stops no longer exist and were removed.",
    );
    expect(render(true, 2)).toContain("Dismiss");
  });
});
