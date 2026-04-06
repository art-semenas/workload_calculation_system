import { useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
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
import { useCreateDivision, useDivisions } from '../hooks/useDivisions'
import { DivisionCreateSchema, type DivisionCreate } from '../types/division'

export default function DivisionListPage() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { data, isLoading } = useDivisions()
  const createDivision = useCreateDivision()

  const { control, handleSubmit, reset } = useForm<DivisionCreate>({
    resolver: zodResolver(DivisionCreateSchema),
    defaultValues: {
      name: '',
    },
  })

  const handleClose = () => {
    setOpen(false)
    reset()
  }

  const handleCreate = handleSubmit(async (formData) => {
    await createDivision.mutateAsync(formData)
    handleClose()
  })

  if (isLoading) {
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
        <Typography variant="h4">Divisions</Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Add division
        </Button>
      </Box>

      {data && data.length > 0 ? (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Branches</TableCell>
                <TableCell>Objects</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((division) => (
                <TableRow
                  key={division.id}
                  hover
                  onClick={() => void navigate(`/divisions/${division.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{division.name}</TableCell>
                  <TableCell>{division.branchCount}</TableCell>
                  <TableCell>{division.objectCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <Typography color="text.secondary">No divisions</Typography>
      )}

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>Add division</DialogTitle>
        <Box component="form" onSubmit={handleCreate}>
          <DialogContent>
            <FormTextField name="name" control={control} label="Name" fullWidth autoFocus />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createDivision.isPending}>
              Create
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  )
}
