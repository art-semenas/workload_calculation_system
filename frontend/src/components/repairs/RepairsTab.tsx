import { Box, Typography } from '@mui/material'

export function RepairsTab({ objectId }: { objectId: string }) {
  return (
    <Box>
      <Typography>Repairs Tab - {objectId}</Typography>
    </Box>
  )
}
