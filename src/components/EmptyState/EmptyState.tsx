import { Box, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

type Props = {
  message: string;
  /** The ways out, as buttons side by side (they wrap on narrow screens). */
  children: ReactNode;
};

/** A dashed box saying there's nothing here, with buttons to fix it (design doc §3.9). */
export const EmptyState = ({ message, children }: Props) => (
  <Box
    sx={{
      mt: 2,
      p: 3,
      border: 1,
      borderStyle: "dashed",
      borderColor: "divider",
      borderRadius: 1,
      textAlign: "center",
    }}
  >
    <Typography sx={{ mb: 1 }}>{message}</Typography>
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{ flexWrap: "wrap", justifyContent: "center" }}
    >
      {children}
    </Stack>
  </Box>
);
