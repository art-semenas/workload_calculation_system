import { Box, Typography } from '@mui/material'

export function RecordsTab({ objectId }: { objectId: string }) {
  return (
    <Box>
      <Typography>Records Tab - {objectId}</Typography>
    </Box>
  )
}
