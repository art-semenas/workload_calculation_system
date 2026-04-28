import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import type { EngineerShare } from '../../types/engineer'

interface AssignedObjectsTableProps {
  objects: EngineerShare[]
  onRemove: (objectId: string) => void
  isRemoving: boolean
}

export default function AssignedObjectsTable({
  objects,
  onRemove,
  isRemoving,
}: AssignedObjectsTableProps) {
  const navigate = useNavigate()

  const sorted = [...objects].sort((a, b) => b.engineerShare - a.engineerShare)

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
            <TableCell>Object</TableCell>
            <TableCell align="right">Engineer Share</TableCell>
            <TableCell align="right">Object Total</TableCell>
            <TableCell align="right">Engineer Count</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((share) => (
            <TableRow key={share.objectId}>
              <TableCell>
                <Button
                  onClick={() => navigate(`/objects/${share.objectId}`)}
                  sx={{
                    textTransform: 'none',
                    color: 'primary.main',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  {share.objectName}
                </Button>
              </TableCell>
              <TableCell align="right">
                {share.engineerShare.toFixed(4)}
              </TableCell>
              <TableCell align="right">
                {share.itogoChisloWithTravel.toFixed(6)}
              </TableCell>
              <TableCell align="right">{share.engineerCount}</TableCell>
              <TableCell align="center">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => onRemove(share.objectId)}
                  disabled={isRemoving}
                >
                  Remove
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
