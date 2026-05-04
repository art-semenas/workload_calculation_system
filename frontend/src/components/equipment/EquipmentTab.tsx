import { Box } from '@mui/material'
import { PhysicalInventory } from './PhysicalInventory'
import { SystemAssignments } from './SystemAssignments'

export function EquipmentTab({ objectId }: { objectId: string }) {
  return (
    <Box sx={{ mt: 0 }}>
      <PhysicalInventory objectId={objectId} />
      <SystemAssignments objectId={objectId} />
    </Box>
  )
}
