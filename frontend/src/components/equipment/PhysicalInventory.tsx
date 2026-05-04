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
  Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCatalogDevices } from '../../hooks/useCatalog'
import {
  useDevices,
  useAddDevice,
  useUpdateDevice,
  useRemoveDevice,
  useAssignments,
} from '../../hooks/useEquipment'
import {
  DeviceAddSchema,
  type DeviceAdd,
  type ObjectDevice,
  type SystemType,
} from '../../types/equipment'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { FormTextField } from '../common/FormTextField'
import { SectionBlock } from '../common/SectionBlock'
import { extractErrorCode, mapEquipmentErrorCode } from '../../utils/errorMessages'
import { tokens } from '../../theme'

const SYSTEM_LABELS: Record<SystemType, string> = {
  OS: 'Security',
  PS: 'Fire',
  VIDEO: 'Video',
}

interface AddDeviceFormValues {
  deviceTypeId: string
  quantityPhysical: number
}

interface EditDeviceFormValues {
  quantityPhysical: number
}

const EditDeviceSchema = DeviceAddSchema.pick({ quantityPhysical: true })

export function PhysicalInventory({ objectId }: { objectId: string }) {
  const { data: devices = [], isLoading } = useDevices(objectId)
  const { data: assignments = [] } = useAssignments(objectId)
  const { data: catalogDevices = [] } = useCatalogDevices()
  const addDevice = useAddDevice(objectId)
  const updateDevice = useUpdateDevice(objectId)
  const removeDevice = useRemoveDevice(objectId)

  const [addOpen, setAddOpen] = useState(false)
  const [editDevice, setEditDevice] = useState<ObjectDevice | null>(null)
  const [deviceToRemove, setDeviceToRemove] = useState<ObjectDevice | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const availableDeviceTypes = catalogDevices.filter(
    (ct) => !devices.some((d) => d.deviceTypeId === ct.id)
  )

  // Map deviceTypeId → system labels (for "Assigned to systems" column)
  const deviceSystemsMap: Record<string, string[]> = {}
  assignments.forEach((a) => {
    if (!deviceSystemsMap[a.deviceTypeId]) deviceSystemsMap[a.deviceTypeId] = []
    const label = SYSTEM_LABELS[a.systemType]
    if (!deviceSystemsMap[a.deviceTypeId].includes(label)) {
      deviceSystemsMap[a.deviceTypeId].push(label)
    }
  })

  const totalUnits = devices.reduce((sum, d) => sum + d.quantityPhysical, 0)

  const addForm = useForm<AddDeviceFormValues>({
    resolver: zodResolver(DeviceAddSchema),
    defaultValues: { deviceTypeId: '', quantityPhysical: 1 },
  })

  const editForm = useForm<EditDeviceFormValues>({
    resolver: zodResolver(EditDeviceSchema),
    defaultValues: { quantityPhysical: 1 },
  })

  function handleOpenAdd() {
    addForm.reset({ deviceTypeId: '', quantityPhysical: 1 })
    setMutationError(null)
    setAddOpen(true)
  }

  function handleCloseAdd() {
    setAddOpen(false)
  }

  async function handleSubmitAdd(values: AddDeviceFormValues) {
    try {
      const data: DeviceAdd = {
        deviceTypeId: values.deviceTypeId,
        quantityPhysical: values.quantityPhysical,
      }
      await addDevice.mutateAsync(data)
      setAddOpen(false)
    } catch (err) {
      const code = extractErrorCode(err)
      setMutationError(mapEquipmentErrorCode(code))
    }
  }

  function handleOpenEdit(device: ObjectDevice) {
    editForm.reset({ quantityPhysical: device.quantityPhysical })
    setMutationError(null)
    setEditDevice(device)
  }

  function handleCloseEdit() {
    setEditDevice(null)
  }

  async function handleSubmitEdit(values: EditDeviceFormValues) {
    if (!editDevice) return
    try {
      await updateDevice.mutateAsync({
        deviceTypeId: editDevice.deviceTypeId,
        data: { deviceTypeId: editDevice.deviceTypeId, quantityPhysical: values.quantityPhysical },
      })
      setEditDevice(null)
    } catch (err) {
      const code = extractErrorCode(err)
      setMutationError(mapEquipmentErrorCode(code))
    }
  }

  async function handleConfirmRemove() {
    if (!deviceToRemove) return
    try {
      await removeDevice.mutateAsync(deviceToRemove.deviceTypeId)
      setDeviceToRemove(null)
    } catch (err) {
      const code = extractErrorCode(err)
      setMutationError(mapEquipmentErrorCode(code))
      setDeviceToRemove(null)
    }
  }

  const removalMessage = (() => {
    if (!deviceToRemove) return 'Remove this device from the inventory?'
    const deviceAssignments = assignments.filter(
      (a) => a.deviceTypeId === deviceToRemove.deviceTypeId
    )
    if (deviceAssignments.length === 0) {
      return `Remove "${deviceToRemove.deviceTypeName}" from the inventory?`
    }
    const details = deviceAssignments
      .map((a) => `${SYSTEM_LABELS[a.systemType]} x ${a.quantityMaintained}`)
      .join(', ')
    return `This will remove assignments: ${details}. Continue?`
  })()

  if (isLoading) return <CircularProgress size={24} />

  return (
    <SectionBlock
      label="A · Physical inventory"
      meta={`${devices.length} device types · ${totalUnits} units total`}
      actions={
        <Button variant="outlined" size="small" onClick={handleOpenAdd}>
          Add device
        </Button>
      }
    >
      {mutationError && (
        <Alert severity="error" onClose={() => setMutationError(null)} sx={{ mb: 2 }}>
          {mutationError}
        </Alert>
      )}

      <Table size="small" aria-label="physical inventory table">
        <TableHead>
          <TableRow>
            <TableCell>Device</TableCell>
            <TableCell>Qty physical</TableCell>
            <TableCell>Assigned to systems</TableCell>
            <TableCell sx={{ width: 80 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {devices.map((device) => (
            <TableRow key={device.id}>
              <TableCell>{device.deviceTypeName}</TableCell>
              <TableCell
                sx={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 13 }}
              >
                {device.quantityPhysical}
              </TableCell>
              <TableCell sx={{ color: tokens.ink3, fontSize: 13 }}>
                {(deviceSystemsMap[device.deviceTypeId] ?? []).join(', ') || '—'}
              </TableCell>
              <TableCell align="right" sx={{ p: '4px 8px' }}>
                <IconButton
                  size="small"
                  aria-label={`edit ${device.deviceTypeName}`}
                  onClick={() => handleOpenEdit(device)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label={`remove ${device.deviceTypeName}`}
                  onClick={() => setDeviceToRemove(device)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          {devices.length === 0 && (
            <TableRow>
              <TableCell colSpan={4}>
                <Typography sx={{ fontSize: 13, color: tokens.ink3 }}>
                  No devices in inventory.
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Add Device Dialog */}
      <Dialog open={addOpen} onClose={handleCloseAdd} maxWidth="xs" fullWidth>
        <DialogTitle>Add Device</DialogTitle>
        <Box
          component="form"
          onSubmit={(e) => {
            void addForm.handleSubmit(handleSubmitAdd)(e)
          }}
        >
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Controller
              name="deviceTypeId"
              control={addForm.control}
              render={({ field, fieldState }) => (
                <FormControl fullWidth size="small" error={!!fieldState.error}>
                  <InputLabel>Device Type</InputLabel>
                  <Select
                    {...field}
                    label="Device Type"
                    displayEmpty
                    SelectDisplayProps={{ 'aria-label': 'Device Type' }}
                  >
                    <MenuItem value="">
                      <em>Select device type</em>
                    </MenuItem>
                    {availableDeviceTypes.map((dt) => (
                      <MenuItem key={dt.id} value={dt.id}>
                        {dt.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldState.error && <FormHelperText>{fieldState.error.message}</FormHelperText>}
                </FormControl>
              )}
            />
            <FormTextField
              name="quantityPhysical"
              control={addForm.control}
              label="Qty physical"
              type="number"
              size="small"
              inputProps={{ min: 1 }}
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAdd}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={addDevice.isPending}>
              Add
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit Device Dialog */}
      <Dialog open={!!editDevice} onClose={handleCloseEdit} maxWidth="xs" fullWidth>
        <DialogTitle>Edit — {editDevice?.deviceTypeName}</DialogTitle>
        <Box
          component="form"
          onSubmit={(e) => {
            void editForm.handleSubmit(handleSubmitEdit)(e)
          }}
        >
          <DialogContent sx={{ pt: 1 }}>
            <FormTextField
              name="quantityPhysical"
              control={editForm.control}
              label="Qty physical"
              type="number"
              size="small"
              inputProps={{ min: 1 }}
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEdit}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={updateDevice.isPending}>
              Save
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Remove Confirm */}
      <ConfirmDialog
        open={!!deviceToRemove}
        title="Remove Device?"
        message={removalMessage}
        onConfirm={() => void handleConfirmRemove()}
        onCancel={() => setDeviceToRemove(null)}
        confirmLabel="Remove"
      />
    </SectionBlock>
  )
}
