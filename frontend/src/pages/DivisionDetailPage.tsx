import { useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { FormTextField } from '../components/common/FormTextField'
import { useCreateBranch, useDivision, useUpdateDivision } from '../hooks/useDivisions'
import { BranchCreateSchema, type BranchCreate } from '../types/division'

export default function DivisionDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [openBranchDialog, setOpenBranchDialog] = useState(false)

  const { data: division, isLoading } = useDivision(id || '')
  const updateDivision = useUpdateDivision()
  const createBranch = useCreateBranch(id || '')

  const {
    control,
    handleSubmit: handleBranchSubmit,
    reset,
  } = useForm<BranchCreate>({
    resolver: zodResolver(BranchCreateSchema),
    defaultValues: {
      name: '',
    },
  })

  const handleEditName = () => {
    if (division) {
      setNewName(division.name)
      setEditingName(true)
    }
  }

  const handleSaveName = async () => {
    if (id && newName.trim()) {
      await updateDivision.mutateAsync({ id, data: { name: newName } })
      setEditingName(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingName(false)
    setNewName('')
  }

  const handleCloseBranchDialog = () => {
    setOpenBranchDialog(false)
    reset()
  }

  const handleCreateBranch = handleBranchSubmit(async (formData) => {
    await createBranch.mutateAsync(formData)
    handleCloseBranchDialog()
  })

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!division) {
    return <Typography color="error">Division not found</Typography>
  }

  return (
    <Box>
      {/* Breadcrumb */}
      <Box sx={{ mb: 2 }}>
        <Link href="/divisions" underline="hover" sx={{ cursor: 'pointer', mr: 1 }}>
          Divisions
        </Link>
        <Typography component="span" sx={{ mr: 1 }}>
          &gt;
        </Typography>
        <Typography component="span">{division.name}</Typography>
      </Box>

      {/* Division Name with Edit */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        {editingName ? (
          <>
            <TextField
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              size="small"
            />
            <Button size="small" onClick={handleSaveName}>
              Save
            </Button>
            <Button size="small" onClick={handleCancelEdit}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Typography variant="h4">{division.name}</Typography>
            <IconButton size="small" onClick={handleEditName}>
              <EditOutlinedIcon />
            </IconButton>
          </>
        )}
      </Box>

      {/* Add Branch Button */}
      <Box sx={{ mb: 3 }}>
        <Button variant="contained" onClick={() => setOpenBranchDialog(true)}>
          Add branch
        </Button>
      </Box>

      {/* Branches Table */}
      {division.branches && division.branches.length > 0 ? (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Objects</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {division.branches.map((branch) => (
                <TableRow
                  key={branch.id}
                  hover
                  onClick={() => navigate(`/branches/${branch.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{branch.name}</TableCell>
                  <TableCell>{branch.objectCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <Typography color="text.secondary">No branches</Typography>
      )}

      {/* Create Branch Dialog */}
      <Dialog open={openBranchDialog} onClose={handleCloseBranchDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add branch</DialogTitle>
        <Box component="form" onSubmit={handleCreateBranch}>
          <DialogContent>
            <FormTextField
              name="name"
              control={control}
              label="Name"
              fullWidth
              autoFocus
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseBranchDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createBranch.isPending}>
              Create
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  )
}
