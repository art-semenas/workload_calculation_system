import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCatalogDeviceContexts } from '../../hooks/useCatalog'
import {
  useDevices,
  useAssignments,
  useAddAssignment,
  useUpdateAssignment,
  useRemoveAssignment,
} from '../../hooks/useEquipment'
import {
  AssignmentCreateSchema,
  AssignmentUpdateSchema,
  SystemTypeSchema,
  type AssignmentCreate,
  type AssignmentUpdate,
  type ObjectSystemAssignment,
  type SystemType,
} from '../../types/equipment'
import { ConfirmDialog } from '../common/ConfirmDialog'

interface AddAssignmentFormValues {
  deviceTypeId: string
  systemType: string
  quantityMaintained: number
}

interface EditAssignmentFormValues {
  quantityMaintained: number
}

const SYSTEM_TYPE_LABELS: Record<SystemType, string> = {
  OS: 'OS',
  PS: 'PS',
  VIDEO: 'VIDEO',
}

function mapErrorCode(code: string | undefined): string {
  if (code === 'DEVICE_NOT_IN_INVENTORY') return 'Device is not in the physical inventory.'
  if (code === 'NO_CONTEXT_FOR_SYSTEM')
    return 'No catalog context exists for this device and system type.'
  return 'An error occurred.'
}

// Sub-component for add dialog — needs access to catalog contexts based on selected device
function AddAssignmentDialog({
  open,
  deviceIds,
  deviceNames,
  onClose,
  onSubmit,
  isPending,
}: {
  open: boolean
  deviceIds: string[]
  deviceNames: Record<string, string>
  onClose: () => void
  onSubmit: (values: AddAssignmentFormValues) => Promise<void>
  isPending: boolean
}) {
  const form = useForm<AddAssignmentFormValues>({
    resolver: zodResolver(AssignmentCreateSchema),
    defaultValues: { deviceTypeId: '', systemType: '', quantityMaintained: 0 },
  })

  const selectedDeviceTypeId = form.watch('deviceTypeId')
  const { data: contexts = [] } = useCatalogDeviceContexts(selectedDeviceTypeId || undefined)
  const availableSystemTypes = contexts.map((c) => c.systemType)

  function handleClose() {
    form.reset()
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Assignment</DialogTitle>
      <form
        onSubmit={(e) => {
          void form.handleSubmit(onSubmit)(e)
        }}
      >
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Controller
            name="deviceTypeId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Box>
                <Typography variant="caption">Device</Typography>
                <Select
                  {...field}
                  fullWidth
                  displayEmpty
                  size="small"
                  error={!!fieldState.error}
                  inputProps={{ 'aria-label': 'Device' }}
                  onChange={(e) => {
                    field.onChange(e)
                    form.setValue('systemType', '')
                  }}
                >
                  <MenuItem value="">
                    <em>Select device</em>
                  </MenuItem>
                  {deviceIds.map((id) => (
                    <MenuItem key={id} value={id}>
                      {deviceNames[id] ?? id}
                    </MenuItem>
                  ))}
                </Select>
                {fieldState.error && (
                  <Typography variant="caption" color="error">
                    {fieldState.error.message}
                  </Typography>
                )}
              </Box>
            )}
          />

          <Controller
            name="systemType"
            control={form.control}
            render={({ field, fieldState }) => (
              <Box>
                <Typography variant="caption">System Type</Typography>
                <Select
                  {...field}
                  fullWidth
                  displayEmpty
                  size="small"
                  error={!!fieldState.error}
                  disabled={!selectedDeviceTypeId}
                  inputProps={{ 'aria-label': 'System Type' }}
                >
                  <MenuItem value="">
                    <em>Select system type</em>
                  </MenuItem>
                  {availableSystemTypes.map((st) => (
                    <MenuItem key={st} value={st}>
                      {SYSTEM_TYPE_LABELS[st]}
                    </MenuItem>
                  ))}
                </Select>
                {fieldState.error && (
                  <Typography variant="caption" color="error">
                    {fieldState.error.message}
                  </Typography>
                )}
              </Box>
            )}
          />

          <Controller
            name="quantityMaintained"
            control={form.control}
            render={({ field, fieldState }) => (
              <Box>
                <Typography variant="caption">Quantity Maintained</Typography>
                <input
                  type="number"
                  {...field}
                  aria-label="Quantity Maintained"
                  min={0}
                  style={{ display: 'block', width: '100%' }}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                />
                {fieldState.error && (
                  <Typography variant="caption" color="error">
                    {fieldState.error.message}
                  </Typography>
                )}
              </Box>
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isPending}>
            Add
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export function SystemAssignments({ objectId }: { objectId: string }) {
  const { data: devices = [], isLoading: devicesLoading } = useDevices(objectId)
  const { data: assignments = [], isLoading: assignmentsLoading } = useAssignments(objectId)
  const addAssignment = useAddAssignment(objectId)
  const updateAssignment = useUpdateAssignment(objectId)
  const removeAssignment = useRemoveAssignment(objectId)

  const [addOpen, setAddOpen] = useState(false)
  const [editAssignment, setEditAssignment] = useState<ObjectSystemAssignment | null>(null)
  const [removeAssignment_, setRemoveAssignment] = useState<ObjectSystemAssignment | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const editForm = useForm<EditAssignmentFormValues>({
    resolver: zodResolver(AssignmentUpdateSchema),
    defaultValues: { quantityMaintained: 0 },
  })

  // Group assignments by deviceTypeId
  const deviceGroups = devices.map((device) => ({
    device,
    assignments: assignments.filter((a) => a.deviceTypeId === device.deviceTypeId),
  }))

  const deviceIds = devices.map((d) => d.deviceTypeId)
  const deviceNames: Record<string, string> = {}
  for (const d of devices) {
    deviceNames[d.deviceTypeId] = d.deviceTypeName
  }

  // Check over-capacity per device
  const overCapacityDeviceIds = new Set(
    devices
      .filter((device) =>
        assignments.some(
          (a) =>
            a.deviceTypeId === device.deviceTypeId && a.quantityMaintained > device.quantityPhysical
        )
      )
      .map((d) => d.deviceTypeId)
  )

  async function handleSubmitAdd(values: AddAssignmentFormValues) {
    try {
      const parsed = SystemTypeSchema.parse(values.systemType)
      const data: AssignmentCreate = {
        deviceTypeId: values.deviceTypeId,
        systemType: parsed,
        quantityMaintained: values.quantityMaintained,
      }
      await addAssignment.mutateAsync(data)
      setAddOpen(false)
    } catch (err) {
      const code = (err as { response?: { data?: { error?: { code?: string } } } }).response?.data
        ?.error?.code
      setMutationError(mapErrorCode(code))
    }
  }

  function handleOpenEdit(assignment: ObjectSystemAssignment) {
    editForm.reset({ quantityMaintained: assignment.quantityMaintained })
    setMutationError(null)
    setEditAssignment(assignment)
  }

  function handleCloseEdit() {
    setEditAssignment(null)
  }

  async function handleSubmitEdit(values: EditAssignmentFormValues) {
    if (!editAssignment) return
    try {
      const data: AssignmentUpdate = { quantityMaintained: values.quantityMaintained }
      await updateAssignment.mutateAsync({ assignmentId: editAssignment.id, data })
      setEditAssignment(null)
    } catch (err) {
      const code = (err as { response?: { data?: { error?: { code?: string } } } }).response?.data
        ?.error?.code
      setMutationError(mapErrorCode(code))
    }
  }

  async function handleConfirmRemove() {
    if (!removeAssignment_) return
    try {
      await removeAssignment.mutateAsync(removeAssignment_.id)
      setRemoveAssignment(null)
    } catch (err) {
      const code = (err as { response?: { data?: { error?: { code?: string } } } }).response?.data
        ?.error?.code
      setMutationError(mapErrorCode(code))
      setRemoveAssignment(null)
    }
  }

  if (devicesLoading || assignmentsLoading) {
    return <CircularProgress size={24} />
  }

  return (
    <Box>
      {mutationError && (
        <Alert severity="error" onClose={() => setMutationError(null)} sx={{ mb: 2 }}>
          {mutationError}
        </Alert>
      )}

      {overCapacityDeviceIds.size > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          One or more assignments exceed the physical quantity for the device.
        </Alert>
      )}

      {deviceGroups.map(({ device, assignments: groupAssignments }) => (
        <Box key={device.deviceTypeId} sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            {device.deviceTypeName}
          </Typography>
          {overCapacityDeviceIds.has(device.deviceTypeId) && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              Some assignments for {device.deviceTypeName} exceed quantity physical (
              {device.quantityPhysical}).
            </Alert>
          )}
          <Table size="small" aria-label={`assignments for ${device.deviceTypeName}`}>
            <TableHead>
              <TableRow>
                <TableCell>System Type</TableCell>
                <TableCell>Qty Maintained</TableCell>
                <TableCell>R1 Min</TableCell>
                <TableCell>R2 Min</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groupAssignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>{assignment.systemType}</TableCell>
                  <TableCell>{assignment.quantityMaintained}</TableCell>
                  <TableCell>{assignment.r1Minutes}</TableCell>
                  <TableCell>{assignment.r2Minutes}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      aria-label={`edit assignment ${assignment.systemType}`}
                      onClick={() => handleOpenEdit(assignment)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      aria-label={`remove assignment ${assignment.systemType}`}
                      onClick={() => setRemoveAssignment(assignment)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {groupAssignments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="body2" color="text.secondary">
                      No assignments for this device.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      ))}

      {devices.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No devices in inventory. Add devices above before creating assignments.
        </Typography>
      )}

      {devices.length > 0 && (
        <Button sx={{ mt: 1 }} onClick={() => setAddOpen(true)} variant="outlined" size="small">
          Add assignment
        </Button>
      )}

      <AddAssignmentDialog
        open={addOpen}
        deviceIds={deviceIds}
        deviceNames={deviceNames}
        onClose={() => setAddOpen(false)}
        onSubmit={handleSubmitAdd}
        isPending={addAssignment.isPending}
      />

      {/* Edit Assignment Dialog */}
      <Dialog open={!!editAssignment} onClose={handleCloseEdit} maxWidth="xs" fullWidth>
        <DialogTitle>
          Edit Assignment — {editAssignment?.deviceTypeName} / {editAssignment?.systemType}
        </DialogTitle>
        <form
          onSubmit={(e) => {
            void editForm.handleSubmit(handleSubmitEdit)(e)
          }}
        >
          <DialogContent sx={{ pt: 1 }}>
            <Controller
              name="quantityMaintained"
              control={editForm.control}
              render={({ field, fieldState }) => (
                <Box>
                  <Typography variant="caption">Quantity Maintained</Typography>
                  <input
                    type="number"
                    {...field}
                    aria-label="Quantity Maintained"
                    min={0}
                    style={{ display: 'block', width: '100%' }}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                  />
                  {fieldState.error && (
                    <Typography variant="caption" color="error">
                      {fieldState.error.message}
                    </Typography>
                  )}
                </Box>
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEdit}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={updateAssignment.isPending}>
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Remove Confirm Dialog */}
      <ConfirmDialog
        open={!!removeAssignment_}
        title="Remove Assignment?"
        message={`Remove assignment for ${removeAssignment_?.deviceTypeName} / ${removeAssignment_?.systemType}? This action cannot be undone.`}
        onConfirm={() => void handleConfirmRemove()}
        onCancel={() => setRemoveAssignment(null)}
        confirmLabel="Remove"
      />
    </Box>
  )
}
