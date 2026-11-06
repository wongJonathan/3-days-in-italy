import { rulesFor } from "../../utils/availability/seasonal-notes.ts";
import { travelLabel, warningText } from "../../utils/editor/copy.ts";
import type { IsoDate } from "../../utils/hours/calendar.ts";
import type { ScheduledStop } from "../../utils/schedule/schedule.ts";

type Props = { stop: ScheduledStop; date: IsoDate };

/**
 * The Travel Time line above a Stop card, with its long-travel Warning if any.
 * Nothing for the day's first Stop. Shared by the editor and the Trip Overview.
 * The dashed line itself is plain CSS (.connector).
 */
export const Connector = ({ stop, date }: Props) => {
  if (!stop.travel) return null;
  const travelWarning = stop.warnings.find((w) => w.kind === "long-travel");
  return (
    <p className={`connector${travelWarning ? " connector--warning" : ""}`}>
      {travelLabel(stop.travel)}
      {travelWarning && (
        <>
          {" "}
          <span aria-hidden="true">!</span>{" "}
          {warningText(travelWarning, {
            date,
            rules: rulesFor(stop.placeId),
          })}
        </>
      )}
    </p>
  );
};
