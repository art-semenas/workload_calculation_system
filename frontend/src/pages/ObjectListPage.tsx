import { useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { FormTextField } from '../components/common/FormTextField'
import { useCreateObject, useObjects } from '../hooks/useObjects'
import { useDivision, useDivisions } from '../hooks/useDivisions'
import { ObjectCreateSchema, type ObjectCreate } from '../types/object'

export default function ObjectListPage() {
  const navigate = useNavigate()
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('')
  const [openObjectDialog, setOpenObjectDialog] = useState(false)
  const [dialogDivisionId, setDialogDivisionId] = useState<string>('')
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')

  const { data: objects, isLoading } = useObjects(selectedDivisionId || undefined)
  const { data: divisions, isLoading: divisionsLoading } = useDivisions()
  const { data: dialogDivisionDetail, isLoading: dialogDivisionLoading } = useDivision(
    dialogDivisionId || undefined
  )
  const createObject = useCreateObject()

  const {
    control,
    handleSubmit: handleObjectSubmit,
    reset,
  } = useForm<ObjectCreate>({
    resolver: zodResolver(ObjectCreateSchema),
    defaultValues: {
      name: '',
      branchId: '',
    },
  })

  const handleCloseObjectDialog = () => {
    setOpenObjectDialog(false)
    setDialogDivisionId('')
    setSelectedBranchId('')
    reset()
  }

  const handleCreateObject = handleObjectSubmit(async (formData) => {
    await createObject.mutateAsync({ ...formData, branchId: selectedBranchId })
    handleCloseObjectDialog()
  })

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
          Add object
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
                <TableRow
                  key={obj.id}
                  hover
                  onClick={() => navigate(`/objects/${obj.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{obj.name}</TableCell>
                  <TableCell>{obj.divisionName}</TableCell>
                  <TableCell>{obj.branchName}</TableCell>
                  <TableCell>-</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <Typography color="text.secondary">No objects</Typography>
      )}

      <Dialog open={openObjectDialog} onClose={handleCloseObjectDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add object</DialogTitle>
        <Box
          component="form"
          onSubmit={(e) => {
            void handleCreateObject(e)
          }}
        >
          <DialogContent>
            <FormTextField
              name="name"
              control={control}
              label="Name"
              fullWidth
              autoFocus
              sx={{ mt: 2, mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Division</InputLabel>
              <Select
                value={dialogDivisionId}
                label="Division"
                onChange={(e) => {
                  setDialogDivisionId(e.target.value)
                  setSelectedBranchId('')
                }}
                inputProps={{ 'data-testid': 'dialog-division-select' }}
              >
                <MenuItem value="">Select division</MenuItem>
                {divisions &&
                  divisions.map((div) => (
                    <MenuItem key={div.id} value={div.id}>
                      {div.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <FormControl fullWidth disabled={!dialogDivisionId || dialogDivisionLoading}>
              <InputLabel>Branch</InputLabel>
              <Select
                value={selectedBranchId}
                label="Branch"
                onChange={(e) => setSelectedBranchId(e.target.value)}
                inputProps={{ 'data-testid': 'dialog-branch-select' }}
              >
                <MenuItem value="">Select branch</MenuItem>
                {dialogDivisionDetail?.branches.map((branch) => (
                  <MenuItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseObjectDialog}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createObject.isPending || !selectedBranchId}
            >
              Create
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  )
}
