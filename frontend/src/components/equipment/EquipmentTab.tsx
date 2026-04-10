import { Box, Typography } from '@mui/material'
import { PhysicalInventory } from './PhysicalInventory'
import { SystemAssignments } from './SystemAssignments'

export function EquipmentTab({ objectId }: { objectId: string }) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Physical Equipment
      </Typography>
      <PhysicalInventory objectId={objectId} />
      <Box sx={{ my: 3 }} />
      <Typography variant="h6" gutterBottom>
        System Assignments
      </Typography>
      <SystemAssignments objectId={objectId} />
    </Box>
  )
}
