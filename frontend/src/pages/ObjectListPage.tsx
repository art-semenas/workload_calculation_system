import React, { useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useObjects } from '../hooks/useObjects'
import { useDivisions } from '../hooks/useDivisions'
import { useObjectSummary } from '../hooks/useSummary'
import CreateObjectDialog from '../components/dialogs/CreateObjectDialog'


function ObjectStaffingRow({
  objectId,
  name,
  divisionName,
  branchName,
  navigate,
}: {
  objectId: string
  name: string
  divisionName: string
  branchName: string
  navigate: (path: string) => void
}) {
  const { data: summary, isLoading } = useObjectSummary(objectId)
  return (
    <TableRow hover onClick={() => navigate(`/objects/${objectId}`)} sx={{ cursor: 'pointer' }}>
      <TableCell>{name}</TableCell>
      <TableCell>{divisionName}</TableCell>
      <TableCell>{branchName}</TableCell>
      <TableCell>
        {isLoading ? '...' : (summary?.itogoChisloWithTravel.toFixed(6) ?? '—')}
      </TableCell>
    </TableRow>
  )
}

export default function ObjectListPage() {
  const navigate = useNavigate()
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('')
  const [openObjectDialog, setOpenObjectDialog] = useState(false)

  const { data: objects, isLoading } = useObjects(selectedDivisionId || undefined)
  const { data: divisions, isLoading: divisionsLoading } = useDivisions()

  if (isLoading || divisionsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          gap: 2,
        }}
      >
        <Typography variant="h4">Objects</Typography>
        <Button variant="contained" onClick={() => setOpenObjectDialog(true)}>
          Create object
        </Button>
      </Box>

      <Box sx={{ mb: 3, minWidth: 200 }}>
        <FormControl fullWidth>
          <InputLabel>Division</InputLabel>
          <Select
            value={selectedDivisionId}
            label="Division"
            onChange={(e) => setSelectedDivisionId(e.target.value)}
          >
            <MenuItem value="">All divisions</MenuItem>
            {divisions &&
              divisions.map((div) => (
                <MenuItem key={div.id} value={div.id}>
                  {div.name}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      </Box>

      {objects && objects.length > 0 ? (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Division</TableCell>
                <TableCell>Branch</TableCell>
                <TableCell>TOTAL Staffing</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {objects.map((obj) => (
                <ObjectStaffingRow
                  key={obj.id}
                  objectId={obj.id}
                  name={obj.name}
                  divisionName={obj.divisionName || '—'}
                  branchName={obj.branchName || '—'}
                  navigate={navigate}
                />
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <Typography color="text.secondary">No objects</Typography>
      )}

      <CreateObjectDialog
        open={openObjectDialog}
        onClose={() => setOpenObjectDialog(false)}
      />
    </Box>
  )
}
