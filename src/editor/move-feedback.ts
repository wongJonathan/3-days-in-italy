import { formatTime } from "../ui/format.ts";

/** The screen-reader sentence after a move: "Pantheon moved up to stop 2 of 5, now 11:19–12:04." */
export const moveAnnouncement = ({
  name,
  direction,
  position,
  total,
  start,
  end,
}: {
  name: string;
  direction: "up" | "down";
  position: number;
  total: number;
  start: number;
  end: number;
}): string =>
  `${name} moved ${direction} to stop ${position} of ${total}, now ${formatTime(start)}–${formatTime(end)}.`;
