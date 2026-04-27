import { Box, Card, Typography } from '@mui/material'
import { PhysicalInventory } from './PhysicalInventory'
import { SystemAssignments } from './SystemAssignments'

export function EquipmentTab({ objectId }: { objectId: string }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card>
        <Box sx={{ p: '16px 20px', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">Physical Equipment</Typography>
        </Box>
        <Box sx={{ p: '16px 20px' }}>
          <PhysicalInventory objectId={objectId} />
        </Box>
      </Card>

      <Card>
        <Box sx={{ p: '16px 20px', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">System Assignments</Typography>
        </Box>
        <Box sx={{ p: '16px 20px' }}>
          <SystemAssignments objectId={objectId} />
        </Box>
      </Card>
    </Box>
  )
}
