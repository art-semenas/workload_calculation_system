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
import { useBranch, useUpdateBranch } from '../hooks/useBranches'
import { useCreateObject } from '../hooks/useObjects'
import { ObjectCreateSchema, type ObjectCreate } from '../types/object'

export default function BranchDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [openObjectDialog, setOpenObjectDialog] = useState(false)

  const { data: branch, isLoading } = useBranch(id || '')
  const updateBranch = useUpdateBranch()
  const createObject = useCreateObject()

  const {
    control,
    handleSubmit: handleObjectSubmit,
    reset,
  } = useForm<ObjectCreate>({
    resolver: zodResolver(ObjectCreateSchema),
    defaultValues: {
      name: '',
      branchId: id || '',
    },
  })

  const handleEditName = () => {
    if (branch) {
      setNewName(branch.name)
      setEditingName(true)
    }
  }

  const handleSaveName = async () => {
    if (id && newName.trim()) {
      await updateBranch.mutateAsync({ id, data: { name: newName } })
      setEditingName(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingName(false)
    setNewName('')
  }

  const handleCloseObjectDialog = () => {
    setOpenObjectDialog(false)
    reset()
  }

  const handleCreateObject = handleObjectSubmit(async (formData) => {
    await createObject.mutateAsync(formData)
    handleCloseObjectDialog()
  })

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!branch) {
    return <Typography color="error">Branch not found</Typography>
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
        <Link
          href={`/divisions/${branch.divisionId}`}
          underline="hover"
          sx={{ cursor: 'pointer', mr: 1 }}
        >
          {branch.divisionName}
        </Link>
        <Typography component="span" sx={{ mr: 1 }}>
          &gt;
        </Typography>
        <Typography component="span">{branch.name}</Typography>
      </Box>

      {/* Branch Name with Edit */}
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
            <Typography variant="h4">{branch.name}</Typography>
            <IconButton size="small" onClick={handleEditName}>
              <EditOutlinedIcon />
            </IconButton>
          </>
        )}
      </Box>

      {/* Add Object Button */}
      <Box sx={{ mb: 3 }}>
        <Button variant="contained" onClick={() => setOpenObjectDialog(true)}>
          Add object
        </Button>
      </Box>

      {/* Objects Table */}
      {branch.objects && branch.objects.data && branch.objects.data.length > 0 ? (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>TOTAL Staffing (with travel)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {branch.objects.data.map((obj) => (
                <TableRow
                  key={obj.id}
                  hover
                  onClick={() => navigate(`/objects/${obj.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{obj.name}</TableCell>
                  <TableCell>
                    {obj.itogoChisloWithTravel !== null
                      ? obj.itogoChisloWithTravel.toFixed(4)
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <Typography color="text.secondary">No objects</Typography>
      )}

      {/* Create Object Dialog */}
      <Dialog open={openObjectDialog} onClose={handleCloseObjectDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add object</DialogTitle>
        <Box component="form" onSubmit={handleCreateObject}>
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
            <Button onClick={handleCloseObjectDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createObject.isPending}>
              Create
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  )
}
