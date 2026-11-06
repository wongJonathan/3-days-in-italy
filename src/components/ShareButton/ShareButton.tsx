import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  TextField,
} from "@mui/material";
import { useState } from "react";
import type { Trip } from "../../stores/trip.ts";
import { ROUTES } from "../../utils/routes/routes.ts";
import { shareQuery } from "../../utils/share/share.ts";

type Props = { trip: Trip };

export const ShareButton = ({ trip }: Props) => {
  const [copied, setCopied] = useState(false);
  const [manualLink, setManualLink] = useState<string | null>(null);

  const share = async () => {
    const link = `${window.location.origin}${ROUTES.share}?${shareQuery(trip)}`;
    try {
      // Throws when the Clipboard API is missing (navigator.clipboard is undefined).
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setManualLink(link);
    }
  };

  return (
    <>
      <Button variant="contained" onClick={() => void share()}>
        Share link
      </Button>
      <Snackbar
        open={copied}
        autoHideDuration={3000}
        onClose={() => setCopied(false)}
        message="Link copied"
      />
      <Dialog
        open={manualLink !== null}
        onClose={() => setManualLink(null)}
        fullWidth
      >
        <DialogTitle>Copy this link</DialogTitle>
        <DialogContent>
          <TextField
            value={manualLink ?? ""}
            label="Trip link"
            fullWidth
            autoFocus
            margin="dense"
            slotProps={{ htmlInput: { readOnly: true } }}
            onFocus={(e) => e.target.select()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualLink(null)}>Done</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
