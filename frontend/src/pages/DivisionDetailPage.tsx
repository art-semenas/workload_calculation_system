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
  Typography,
} from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { FormTextField } from '../components/common/FormTextField'
import {
  useCreateBranch,
  useDivision,
  useDivisionBranches,
  useUpdateDivision,
} from '../hooks/useDivisions'
import {
  BranchCreateSchema,
  DivisionCreateSchema,
  type BranchCreate,
  type DivisionCreate,
} from '../types/division'

export default function DivisionDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [editingName, setEditingName] = useState(false)
  const [openBranchDialog, setOpenBranchDialog] = useState(false)

  const { data: division, isLoading } = useDivision(id || '')
  const { data: branches = [], isLoading: branchesLoading } = useDivisionBranches(id || '')
  const updateDivision = useUpdateDivision()
  const createBranch = useCreateBranch(id || '')

  const nameForm = useForm<DivisionCreate>({
    resolver: zodResolver(DivisionCreateSchema),
  })

  const {
    control,
    handleSubmit: handleBranchSubmit,
    reset: resetBranchForm,
  } = useForm<BranchCreate>({
    resolver: zodResolver(BranchCreateSchema),
    defaultValues: { name: '' },
  })

  const handleEditName = () => {
    if (division) {
      nameForm.reset({ name: division.name })
      setEditingName(true)
    }
  }

  const handleSaveName = nameForm.handleSubmit(async (data) => {
    if (id) {
      await updateDivision.mutateAsync({ id, data: { name: data.name } })
      setEditingName(false)
    }
  })

  const handleCancelEdit = () => {
    setEditingName(false)
    nameForm.reset()
  }

  const handleCloseBranchDialog = () => {
    setOpenBranchDialog(false)
    resetBranchForm()
  }

  const handleCreateBranch = handleBranchSubmit(async (formData) => {
    await createBranch.mutateAsync(formData)
    handleCloseBranchDialog()
  })

  if (isLoading || branchesLoading) {
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
          <Box
            component="form"
            onSubmit={(e) => {
              void handleSaveName(e)
            }}
            sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}
          >
            <FormTextField
              name="name"
              control={nameForm.control}
              label="Division name"
              size="small"
              autoFocus
            />
            <Button size="small" type="submit" disabled={updateDivision.isPending}>
              Save
            </Button>
            <Button size="small" onClick={handleCancelEdit}>
              Cancel
            </Button>
          </Box>
        ) : (
          <>
            <Typography variant="h4">{division.name}</Typography>
            <IconButton size="small" aria-label="Edit" onClick={handleEditName}>
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
      {branches.length > 0 ? (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Objects</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {branches.map((branch) => (
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
        <Box
          component="form"
          onSubmit={(e) => {
            void handleCreateBranch(e)
          }}
        >
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
