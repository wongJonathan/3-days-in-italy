import type { IsoDate } from "../hours/calendar.ts";
import { formatDate } from "../format.ts";

/** How far down the visible list area the reading line sits. */
const LINE_SHARE = 1 / 3;

export const readingLine = ({
  areaTop,
  viewportHeight,
  scrollY,
}: {
  areaTop: number;
  viewportHeight: number;
  scrollY: number;
}): number =>
  areaTop + Math.min(scrollY, (viewportHeight - areaTop) * LINE_SHARE);

export const pickActive = (
  tops: number[],
  line: number,
  atEnd: boolean,
): number => {
  if (tops.length === 0) return -1;
  if (atEnd) return tops.length - 1;
  return tops.reduce((active, top, i) => (top <= line ? i : active), 0);
};

export const scrollTargetFor = ({
  itemTop,
  line,
  scrollY,
}: {
  itemTop: number;
  line: number;
  scrollY: number;
}): number => Math.max(0, scrollY + itemTop - line + 1);

export const dayHeading = (
  index: number,
  date: IsoDate,
  city: string | null,
): string =>
  [`Day ${index + 1}`, formatDate(date), city].filter(Boolean).join(" · ");
