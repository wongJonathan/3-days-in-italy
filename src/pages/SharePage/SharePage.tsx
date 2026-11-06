import { Button, Stack, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Notices } from "../../components/Notices/Notices.tsx";
import type { CleanPlace } from "../../utils/data/place.ts";
import { ROUTES } from "../../utils/routes/routes.ts";
import { readSharedTrip } from "../../utils/share/share.ts";
import { OverviewPage } from "../OverviewPage/OverviewPage.tsx";

type Props = { places: CleanPlace[] };

/**
 * /share?…: a Shared Trip rebuilt from its link and shown read-only. It never
 * reads or touches the visitor's own saved Trip.
 */
export const SharePage = ({ places }: Props) => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const loaded = useMemo(
    () => readSharedTrip(search, new Set(places.map((p) => p.id))),
    [search, places],
  );
  const [removedDismissed, setRemovedDismissed] = useState(false);
  // "/" sends a visitor with a saved Trip on to it, and anyone else to onboarding.
  const planOwn = () => navigate(ROUTES.home);

  if (!loaded) {
    return (
      <Stack
        component="main"
        spacing={2}
        sx={{ maxWidth: 480, mx: "auto", px: 2, py: 8, textAlign: "center" }}
      >
        <Typography component="h1" variant="h5">
          This trip link can't be opened
        </Typography>
        <Typography color="text.secondary">
          It may have been cut off when it was copied, or changed by hand. Ask
          for the link again, or plan a trip of your own.
        </Typography>
        <div>
          <Button variant="contained" onClick={planOwn}>
            Plan your own trip
          </Button>
        </div>
      </Stack>
    );
  }

  return (
    <OverviewPage
      kind="shared"
      trip={loaded.trip}
      places={places}
      onPlanOwn={planOwn}
      notices={
        <Notices
          // Nothing is saved here, so the "can't save" warning doesn't apply.
          canSave
          removedStops={removedDismissed ? 0 : loaded.removedStops}
          onDismissRemoved={() => setRemovedDismissed(true)}
        />
      }
    />
  );
};
