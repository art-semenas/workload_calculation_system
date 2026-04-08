import { useEffect, useState } from 'react'
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
  Tooltip,
  Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
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
import { FormTextField } from '../common/FormTextField'
import { mapEquipmentErrorCode } from '../../utils/errorMessages'

interface AddAssignmentFormValues {
  deviceTypeId: string
  systemType: string
  quantityMaintained: number
}

interface EditAssignmentFormValues {
  quantityMaintained: number
}

const SYSTEM_TYPE_LABELS: Record<SystemType, string> = {
  OS: 'Security',
  PS: 'Fire',
  VIDEO: 'Video',
}

function AddAssignmentDialog({
  open,
  deviceName,
  deviceTypeId,
  existingSystemTypes,
  onClose,
  onSubmit,
  isPending,
}: {
  open: boolean
  deviceName: string
  deviceTypeId: string
  existingSystemTypes: SystemType[]
  onClose: () => void
  onSubmit: (values: AddAssignmentFormValues) => Promise<void>
  isPending: boolean
}) {
  const form = useForm<AddAssignmentFormValues>({
    resolver: zodResolver(AssignmentCreateSchema),
    defaultValues: { deviceTypeId, systemType: '', quantityMaintained: 0 },
  })

  const { data: contexts = [] } = useCatalogDeviceContexts(deviceTypeId)
  const availableSystemTypes = contexts
    .map((context) => context.systemType)
    .filter((systemType) => !existingSystemTypes.includes(systemType))

  useEffect(() => {
    form.reset({ deviceTypeId, systemType: '', quantityMaintained: 0 })
  }, [deviceTypeId, form])

  function handleClose() {
    form.reset({ deviceTypeId, systemType: '', quantityMaintained: 0 })
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Assignment - {deviceName}</DialogTitle>
      <form
        onSubmit={(e) => {
          void form.handleSubmit(onSubmit)(e)
        }}
      >
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Device: {deviceName}
          </Typography>

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
                  disabled={availableSystemTypes.length === 0}
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
                {availableSystemTypes.length === 0 && (
                  <Typography variant="caption" color="text.secondary">
                    No available systems remain for this device.
                  </Typography>
                )}
              </Box>
            )}
          />

          <FormTextField
            name="quantityMaintained"
            control={form.control}
            label="Quantity Maintained"
            type="number"
            size="small"
            inputProps={{ min: 0 }}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isPending || availableSystemTypes.length === 0}
          >
            Add
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

function AssignmentWarning({
  totalQuantityMaintained,
  quantityPhysical,
}: {
  totalQuantityMaintained: number
  quantityPhysical: number
}) {
  if (totalQuantityMaintained <= quantityPhysical) {
    return null
  }

  return (
    <Tooltip
      title={`Maintained quantity (${totalQuantityMaintained}) exceeds physical quantity (${quantityPhysical})`}
    >
      <Box
        component="span"
        aria-label="over-capacity warning"
        data-testid="over-capacity-warning"
        sx={{ display: 'inline-flex' }}
      >
        <WarningAmberOutlinedIcon color="warning" fontSize="small" />
      </Box>
    </Tooltip>
  )
}

function DeviceAssignmentsGroup({
  device,
  assignments,
  onEdit,
  onRemove,
  onAdd,
}: {
  device: { deviceTypeId: string; deviceTypeName: string; quantityPhysical: number }
  assignments: ObjectSystemAssignment[]
  onEdit: (assignment: ObjectSystemAssignment) => void
  onRemove: (assignment: ObjectSystemAssignment) => void
  onAdd: (deviceTypeId: string) => void
}) {
  const { data: contexts = [] } = useCatalogDeviceContexts(device.deviceTypeId)
  const availableSystemTypes = contexts
    .map((context) => context.systemType)
    .filter((systemType) => !assignments.some((assignment) => assignment.systemType === systemType))
  const totalQuantityMaintained = assignments.reduce(
    (sum, assignment) => sum + assignment.quantityMaintained,
    0
  )

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2">{device.deviceTypeName}</Typography>
          <AssignmentWarning
            totalQuantityMaintained={totalQuantityMaintained}
            quantityPhysical={device.quantityPhysical}
          />
        </Box>
        <Button
          size="small"
          variant="outlined"
          onClick={() => onAdd(device.deviceTypeId)}
          aria-label={`add assignment for ${device.deviceTypeName}`}
          disabled={availableSystemTypes.length === 0}
        >
          Add assignment
        </Button>
      </Box>
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
          {assignments.map((assignment) => (
            <TableRow key={assignment.id}>
              <TableCell>
                <Typography component="span">
                  {SYSTEM_TYPE_LABELS[assignment.systemType]}
                </Typography>
              </TableCell>
              <TableCell>{assignment.quantityMaintained}</TableCell>
              <TableCell>{assignment.r1Minutes}</TableCell>
              <TableCell>{assignment.r2Minutes}</TableCell>
              <TableCell align="right">
                <IconButton
                  size="small"
                  aria-label={`edit assignment ${SYSTEM_TYPE_LABELS[assignment.systemType]}`}
                  onClick={() => onEdit(assignment)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label={`remove assignment ${SYSTEM_TYPE_LABELS[assignment.systemType]}`}
                  onClick={() => onRemove(assignment)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          {assignments.length === 0 && (
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
  )
}

export function SystemAssignments({ objectId }: { objectId: string }) {
  const { data: devices = [], isLoading: devicesLoading } = useDevices(objectId)
  const { data: assignments = [], isLoading: assignmentsLoading } = useAssignments(objectId)
  const addAssignment = useAddAssignment(objectId)
  const updateAssignment = useUpdateAssignment(objectId)
  const removeAssignment = useRemoveAssignment(objectId)

  const [addDeviceTypeId, setAddDeviceTypeId] = useState<string | null>(null)
  const [editAssignment, setEditAssignment] = useState<ObjectSystemAssignment | null>(null)
  const [assignmentToRemove, setAssignmentToRemove] = useState<ObjectSystemAssignment | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const editForm = useForm<EditAssignmentFormValues>({
    resolver: zodResolver(AssignmentUpdateSchema),
    defaultValues: { quantityMaintained: 0 },
  })

  const deviceGroups = devices.map((device) => ({
    device,
    assignments: assignments.filter((a) => a.deviceTypeId === device.deviceTypeId),
  }))

  const addDevice = devices.find((device) => device.deviceTypeId === addDeviceTypeId) ?? null
  const addDeviceAssignments = assignments.filter(
    (assignment) => assignment.deviceTypeId === addDeviceTypeId
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
      setAddDeviceTypeId(null)
    } catch (err) {
      const code = (err as { response?: { data?: { error?: { code?: string } } } }).response?.data
        ?.error?.code
      setMutationError(mapEquipmentErrorCode(code))
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
      setMutationError(mapEquipmentErrorCode(code))
    }
  }

  async function handleConfirmRemove() {
    if (!assignmentToRemove) return
    try {
      await removeAssignment.mutateAsync(assignmentToRemove.id)
      setAssignmentToRemove(null)
    } catch (err) {
      const code = (err as { response?: { data?: { error?: { code?: string } } } }).response?.data
        ?.error?.code
      setMutationError(mapEquipmentErrorCode(code))
      setAssignmentToRemove(null)
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

      {deviceGroups.map(({ device, assignments: groupAssignments }) => (
        <DeviceAssignmentsGroup
          key={device.deviceTypeId}
          device={device}
          assignments={groupAssignments}
          onEdit={handleOpenEdit}
          onRemove={setAssignmentToRemove}
          onAdd={setAddDeviceTypeId}
        />
      ))}

      {devices.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No devices in inventory. Add devices above before creating assignments.
        </Typography>
      )}

      {addDevice ? (
        <AddAssignmentDialog
          open={!!addDevice}
          deviceName={addDevice.deviceTypeName}
          deviceTypeId={addDevice.deviceTypeId}
          existingSystemTypes={addDeviceAssignments.map((assignment) => assignment.systemType)}
          onClose={() => setAddDeviceTypeId(null)}
          onSubmit={handleSubmitAdd}
          isPending={addAssignment.isPending}
        />
      ) : null}

      {/* Edit Assignment Dialog */}
      <Dialog open={!!editAssignment} onClose={handleCloseEdit} maxWidth="xs" fullWidth>
        <DialogTitle>
          Edit Assignment — {editAssignment?.deviceTypeName} /{' '}
          {editAssignment ? SYSTEM_TYPE_LABELS[editAssignment.systemType] : ''}
        </DialogTitle>
        <form
          onSubmit={(e) => {
            void editForm.handleSubmit(handleSubmitEdit)(e)
          }}
        >
          <DialogContent sx={{ pt: 1 }}>
            <FormTextField
              name="quantityMaintained"
              control={editForm.control}
              label="Quantity Maintained"
              type="number"
              size="small"
              inputProps={{ min: 0 }}
              fullWidth
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
        open={!!assignmentToRemove}
        title="Remove Assignment?"
        message={`Remove assignment for ${assignmentToRemove?.deviceTypeName} / ${
          assignmentToRemove ? SYSTEM_TYPE_LABELS[assignmentToRemove.systemType] : ''
        }? This action cannot be undone.`}
        onConfirm={() => void handleConfirmRemove()}
        onCancel={() => setAssignmentToRemove(null)}
        confirmLabel="Remove"
      />
    </Box>
  )
}
