import { Box, Typography } from '@mui/material'

export function TravelTab({ objectId }: { objectId: string }) {
  return (
    <Box>
      <Typography>Travel Tab - {objectId}</Typography>
    </Box>
  )
}
