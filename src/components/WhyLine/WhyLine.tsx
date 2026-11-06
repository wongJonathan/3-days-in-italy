import { Typography } from "@mui/material";
import { reasonLabel } from "../../utils/editor/copy.ts";
import type { Reason } from "../../utils/scoring/score.ts";

/** At most this many reasons are spelled out; the rest stay hidden. */
const MAX_CHIPS = 3;

type Props = {
  chips: Reason[];
  /** Adds " · +2" when some reasons were left out (the Stop card does). */
  showHiddenCount?: boolean;
};

/** "why: Must-See · Art · Rated 4.8": why a Place was suggested. Nothing when there are no reasons. */
export const WhyLine = ({ chips, showHiddenCount = false }: Props) =>
  chips.length > 0 ? (
    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
      why: {chips.slice(0, MAX_CHIPS).map(reasonLabel).join(" · ")}
      {showHiddenCount &&
        chips.length > MAX_CHIPS &&
        ` · +${chips.length - MAX_CHIPS}`}
    </Typography>
  ) : null;
