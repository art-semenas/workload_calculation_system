import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  MenuItem,
  Typography,
  Select,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useEngineer,
  useEngineerSummary,
  useEngineerObjects,
  useUpdateEngineer,
  useAssignObjectToEngineer,
  useRemoveObjectFromEngineer,
} from '../hooks/useEngineers'
import { useDivisions } from '../hooks/useDivisions'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import EngineerSummaryCards from '../components/engineers/EngineerSummaryCards'
import SystemBreakdownChart from '../components/engineers/SystemBreakdownChart'
import AssignedObjectsTable from '../components/engineers/AssignedObjectsTable'
import EngineerAssignDialog from '../components/engineers/EngineerAssignDialog'
import {
  EngineerUpdateSchema,
  type EngineerUpdateRequest,
} from '../types/engineer'

export default function EngineerDetailPage() {
  const { id } = useParams<{ id: string }>()
  if (!id) return <Typography>Engineer not found</Typography>

  const { data: engineer, isLoading: engineerLoading } = useEngineer(id)
  const { data: summary, isLoading: summaryLoading } = useEngineerSummary(id)
  const { data: objects = [], isLoading: objectsLoading } =
    useEngineerObjects(id)
  const { data: divisions = [] } = useDivisions()

  const updateMutation = useUpdateEngineer(id)
  const assignMutation = useAssignObjectToEngineer(id)
  const removeMutation = useRemoveObjectFromEngineer(id)

  const [editOpen, setEditOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [removeObjectId, setRemoveObjectId] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EngineerUpdateRequest>({
    resolver: zodResolver(EngineerUpdateSchema),
    defaultValues: {
      name: engineer?.name || '',
      capacityFte: engineer?.capacityFte,
      homeDivisionId: engineer?.homeDivisionId || '',
    },
  })

  const handleEditOpen = () => {
    reset({
      name: engineer?.name || '',
      capacityFte: engineer?.capacityFte,
      homeDivisionId: engineer?.homeDivisionId || '',
    })
    setEditError(null)
    setEditOpen(true)
  }

  const handleEditClose = () => {
    setEditOpen(false)
    setEditError(null)
  }

  const onEditSubmit = async (data: EngineerUpdateRequest) => {
    try {
      setEditError(null)
      await updateMutation.mutateAsync(data)
      setEditOpen(false)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to update engineer'
      setEditError(message)
    }
  }

  const handleRemoveOpen = (objectId: string) => {
    setRemoveObjectId(objectId)
    setConfirmOpen(true)
  }

  const handleRemoveConfirm = async () => {
    if (!removeObjectId) return
    try {
      await removeMutation.mutateAsync(removeObjectId)
      setConfirmOpen(false)
      setRemoveObjectId(null)
    } catch (err) {
      console.error('Failed to remove engineer assignment:', err)
    }
  }

  const handleRemoveCancel = () => {
    setConfirmOpen(false)
    setRemoveObjectId(null)
  }

  const handleAssignSubmit = async (objectId: string) => {
    try {
      await assignMutation.mutateAsync(objectId)
    } catch (err) {
      console.error('Failed to assign object:', err)
    }
  }

  if (engineerLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!engineer) {
    return <Typography>Engineer not found</Typography>
  }

  const removeObjectName = objects.find(
    (obj) => obj.objectId === removeObjectId
  )?.objectName

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Typography variant="h4">{engineer.name}</Typography>
          <Button variant="contained" onClick={handleEditOpen}>
            Edit
          </Button>
        </Box>

        {/* Summary cards */}
        <EngineerSummaryCards
          summary={summary}
          isLoading={summaryLoading}
        />

        {/* System breakdown */}
        <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
          Workload Breakdown by System
        </Typography>
        <SystemBreakdownChart summary={summary} />

        {/* Assigned objects section */}
        <Box sx={{ mt: 4, mb: 2 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h6">Assigned Objects</Typography>
            <Button
              variant="contained"
              onClick={() => setAssignOpen(true)}
            >
              Assign Object
            </Button>
          </Box>

          {objectsLoading ? (
            <CircularProgress />
          ) : objects.length === 0 ? (
            <Typography color="textSecondary">
              No objects assigned
            </Typography>
          ) : (
            <AssignedObjectsTable
              objects={objects}
              onRemove={handleRemoveOpen}
              isRemoving={removeMutation.isPending}
            />
          )}
        </Box>
      </Box>

      {/* Edit Engineer Dialog */}
      <Dialog open={editOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Engineer</DialogTitle>
        <DialogContent>
          {editError && <Alert severity="error" sx={{ mb: 2 }}>{editError}</Alert>}
          <form>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Name"
                  fullWidth
                  margin="normal"
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              )}
            />
            <Controller
              name="capacityFte"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Capacity FTE"
                  type="number"
                  fullWidth
                  margin="normal"
                  error={!!errors.capacityFte}
                  helperText={errors.capacityFte?.message}
                  inputProps={{ step: 0.1 }}
                />
              )}
            />
            <Controller
              name="homeDivisionId"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth margin="normal" error={!!errors.homeDivisionId}>
                  <InputLabel>Division</InputLabel>
                  <Select
                    {...field}
                    label="Division"
                  >
                    <MenuItem value="">None</MenuItem>
                    {divisions.map((div) => (
                      <MenuItem key={div.id} value={div.id}>
                        {div.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button
            onClick={handleSubmit(onEditSubmit)}
            variant="contained"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Object Dialog */}
      <EngineerAssignDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        onAssign={handleAssignSubmit}
        isAssigning={assignMutation.isPending}
      />

      {/* Confirm Remove Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Remove Assignment"
        message={`Remove engineer assignment from object «${removeObjectName}»?`}
        onConfirm={handleRemoveConfirm}
        onCancel={handleRemoveCancel}
        confirmLabel="Remove"
      />
    </Container>
  )
}
