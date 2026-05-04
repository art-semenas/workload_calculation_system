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
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
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
  type ObjectDevice,
  type ObjectSystemAssignment,
  type SystemType,
} from '../../types/equipment'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { FormTextField } from '../common/FormTextField'
import { SectionBlock } from '../common/SectionBlock'
import { extractErrorCode, mapEquipmentErrorCode } from '../../utils/errorMessages'
import { tokens } from '../../theme'

const SYSTEM_TYPE_LABELS: Record<SystemType, string> = {
  OS: 'Security',
  PS: 'Fire',
  VIDEO: 'Video',
}

// ── Add assignment dialog ────────────────────────────────────────────────────

interface AddFormValues {
  deviceTypeId: string
  systemType: string
  quantityMaintained: number
}

function AddAssignmentDialog({
  open,
  devices,
  assignments,
  onClose,
  onSubmit,
  isPending,
}: {
  open: boolean
  devices: ObjectDevice[]
  assignments: ObjectSystemAssignment[]
  onClose: () => void
  onSubmit: (values: AddFormValues) => Promise<void>
  isPending: boolean
}) {
  const [selectedDeviceTypeId, setSelectedDeviceTypeId] = useState('')
  const { data: contexts = [] } = useCatalogDeviceContexts(selectedDeviceTypeId)

  const existingSystemTypes = assignments
    .filter((a) => a.deviceTypeId === selectedDeviceTypeId)
    .map((a) => a.systemType)

  const availableSystemTypes = contexts
    .map((c) => c.systemType)
    .filter((st) => !existingSystemTypes.includes(st))

  const form = useForm<AddFormValues>({
    resolver: zodResolver(AssignmentCreateSchema),
    defaultValues: { deviceTypeId: '', systemType: '', quantityMaintained: 0 },
  })

  function handleClose() {
    form.reset({ deviceTypeId: '', systemType: '', quantityMaintained: 0 })
    setSelectedDeviceTypeId('')
    onClose()
  }

  function handleDeviceChange(deviceTypeId: string) {
    setSelectedDeviceTypeId(deviceTypeId)
    form.setValue('deviceTypeId', deviceTypeId)
    form.setValue('systemType', '')
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add assignment</DialogTitle>
      <Box
        component="form"
        onSubmit={(e) => {
          void form.handleSubmit(onSubmit)(e)
        }}
      >
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Device</InputLabel>
            <Select
              value={selectedDeviceTypeId}
              label="Device"
              onChange={(e) => handleDeviceChange(e.target.value)}
              SelectDisplayProps={{ 'aria-label': 'Device' }}
            >
              <MenuItem value="">
                <em>Select device</em>
              </MenuItem>
              {devices.map((d) => (
                <MenuItem key={d.deviceTypeId} value={d.deviceTypeId}>
                  {d.deviceTypeName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Controller
            name="systemType"
            control={form.control}
            render={({ field, fieldState }) => (
              <FormControl
                fullWidth
                size="small"
                error={!!fieldState.error}
                disabled={!selectedDeviceTypeId}
              >
                <InputLabel>System Type</InputLabel>
                <Select
                  {...field}
                  label="System Type"
                  SelectDisplayProps={{ 'aria-label': 'System Type' }}
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
                {fieldState.error && <FormHelperText>{fieldState.error.message}</FormHelperText>}
                {selectedDeviceTypeId && availableSystemTypes.length === 0 && (
                  <FormHelperText>No available system types for this device.</FormHelperText>
                )}
              </FormControl>
            )}
          />

          <FormTextField
            name="quantityMaintained"
            control={form.control}
            label="Qty maintained"
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
            disabled={isPending || !selectedDeviceTypeId || availableSystemTypes.length === 0}
          >
            Add
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

// ── Edit assignment dialog ───────────────────────────────────────────────────

interface EditFormValues {
  quantityMaintained: number
}

function EditAssignmentDialog({
  assignment,
  onClose,
  onSubmit,
  isPending,
}: {
  assignment: ObjectSystemAssignment | null
  onClose: () => void
  onSubmit: (values: EditFormValues) => Promise<void>
  isPending: boolean
}) {
  const form = useForm<EditFormValues>({
    resolver: zodResolver(AssignmentUpdateSchema),
    defaultValues: { quantityMaintained: 0 },
  })

  useEffect(() => {
    if (assignment) form.reset({ quantityMaintained: assignment.quantityMaintained })
  }, [assignment, form])

  return (
    <Dialog open={!!assignment} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        Edit — {assignment?.deviceTypeName}
        {assignment ? ` / ${SYSTEM_TYPE_LABELS[assignment.systemType]}` : ''}
      </DialogTitle>
      <Box
        component="form"
        onSubmit={(e) => {
          void form.handleSubmit(onSubmit)(e)
        }}
      >
        <DialogContent sx={{ pt: 1 }}>
          <FormTextField
            name="quantityMaintained"
            control={form.control}
            label="Qty maintained"
            type="number"
            size="small"
            inputProps={{ min: 0 }}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isPending}>
            Save
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function SystemAssignments({ objectId }: { objectId: string }) {
  const { data: devices = [], isLoading: devicesLoading } = useDevices(objectId)
  const { data: assignments = [], isLoading: assignmentsLoading } = useAssignments(objectId)
  const addAssignment = useAddAssignment(objectId)
  const updateAssignment = useUpdateAssignment(objectId)
  const removeAssignment = useRemoveAssignment(objectId)

  const [addOpen, setAddOpen] = useState(false)
  const [editAssignment, setEditAssignment] = useState<ObjectSystemAssignment | null>(null)
  const [assignmentToRemove, setAssignmentToRemove] = useState<ObjectSystemAssignment | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

  // Over-capacity check: sum quantityMaintained per device
  const deviceCapacity: Record<string, { totalMaintained: number; physical: number }> = {}
  devices.forEach((d) => {
    deviceCapacity[d.deviceTypeId] = { totalMaintained: 0, physical: d.quantityPhysical }
  })
  assignments.forEach((a) => {
    if (deviceCapacity[a.deviceTypeId]) {
      deviceCapacity[a.deviceTypeId].totalMaintained += a.quantityMaintained
    }
  })

  async function handleSubmitAdd(values: AddFormValues) {
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
      const code = extractErrorCode(err)
      setMutationError(mapEquipmentErrorCode(code))
    }
  }

  async function handleSubmitEdit(values: EditFormValues) {
    if (!editAssignment) return
    try {
      const data: AssignmentUpdate = { quantityMaintained: values.quantityMaintained }
      await updateAssignment.mutateAsync({ assignmentId: editAssignment.id, data })
      setEditAssignment(null)
    } catch (err) {
      const code = extractErrorCode(err)
      setMutationError(mapEquipmentErrorCode(code))
    }
  }

  async function handleConfirmRemove() {
    if (!assignmentToRemove) return
    try {
      await removeAssignment.mutateAsync(assignmentToRemove.id)
      setAssignmentToRemove(null)
    } catch (err) {
      const code = extractErrorCode(err)
      setMutationError(mapEquipmentErrorCode(code))
      setAssignmentToRemove(null)
    }
  }

  if (devicesLoading || assignmentsLoading) return <CircularProgress size={24} />

  return (
    <SectionBlock
      label="B · System assignments"
      meta={`${assignments.length} entries`}
      actions={
        <Button
          variant="outlined"
          size="small"
          disabled={devices.length === 0}
          onClick={() => setAddOpen(true)}
        >
          Add assignment
        </Button>
      }
    >
      {mutationError && (
        <Alert severity="error" onClose={() => setMutationError(null)} sx={{ mb: 2 }}>
          {mutationError}
        </Alert>
      )}

      <Table size="small" aria-label="system assignments table">
        <TableHead>
          <TableRow>
            <TableCell>Device</TableCell>
            <TableCell>System</TableCell>
            <TableCell>Qty maintained</TableCell>
            <TableCell>R1</TableCell>
            <TableCell>R2</TableCell>
            <TableCell sx={{ width: 80 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {assignments.map((a) => {
            const cap = deviceCapacity[a.deviceTypeId]
            const overCapacity = cap ? cap.totalMaintained > cap.physical : false
            return (
              <TableRow key={a.id}>
                <TableCell>{a.deviceTypeName}</TableCell>
                <TableCell sx={{ color: tokens.ink3 }}>
                  {SYSTEM_TYPE_LABELS[a.systemType]}
                </TableCell>
                <TableCell
                  sx={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 13 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {a.quantityMaintained}
                    {overCapacity && (
                      <Tooltip
                        title={`Total maintained (${cap?.totalMaintained}) exceeds physical (${cap?.physical})`}
                      >
                        <Box
                          component="span"
                          aria-label="over-capacity warning"
                          data-testid="over-capacity-warning"
                          sx={{ display: 'inline-flex', ml: 0.5 }}
                        >
                          <WarningAmberOutlinedIcon color="warning" sx={{ fontSize: 14 }} />
                        </Box>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell
                  sx={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 13 }}
                >
                  {a.r1Minutes != null ? a.r1Minutes.toFixed(4) : '—'}
                </TableCell>
                <TableCell
                  sx={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 13 }}
                >
                  {a.r2Minutes != null ? a.r2Minutes.toFixed(4) : '—'}
                </TableCell>
                <TableCell align="right" sx={{ p: '4px 8px' }}>
                  <IconButton
                    size="small"
                    aria-label={`edit ${a.deviceTypeName} / ${SYSTEM_TYPE_LABELS[a.systemType]}`}
                    onClick={() => setEditAssignment(a)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label={`unassign ${a.deviceTypeName} / ${SYSTEM_TYPE_LABELS[a.systemType]}`}
                    onClick={() => setAssignmentToRemove(a)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            )
          })}
          {assignments.length === 0 && (
            <TableRow>
              <TableCell colSpan={6}>
                <Typography sx={{ fontSize: 13, color: tokens.ink3 }}>
                  {devices.length === 0
                    ? 'Add devices to inventory first before creating assignments.'
                    : 'No assignments yet.'}
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <AddAssignmentDialog
        open={addOpen}
        devices={devices}
        assignments={assignments}
        onClose={() => setAddOpen(false)}
        onSubmit={handleSubmitAdd}
        isPending={addAssignment.isPending}
      />

      <EditAssignmentDialog
        assignment={editAssignment}
        onClose={() => setEditAssignment(null)}
        onSubmit={handleSubmitEdit}
        isPending={updateAssignment.isPending}
      />

      <ConfirmDialog
        open={!!assignmentToRemove}
        title="Remove assignment?"
        message={`Remove ${assignmentToRemove?.deviceTypeName ?? ''} / ${
          assignmentToRemove ? SYSTEM_TYPE_LABELS[assignmentToRemove.systemType] : ''
        }? This cannot be undone.`}
        onConfirm={() => void handleConfirmRemove()}
        onCancel={() => setAssignmentToRemove(null)}
        confirmLabel="Remove"
      />
    </SectionBlock>
  )
}
