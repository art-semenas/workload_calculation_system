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
import { useCatalogDevices } from '../../hooks/useCatalog'
import {
  useDevices,
  useAddDevice,
  useUpdateDevice,
  useRemoveDevice,
  useAssignments,
} from '../../hooks/useEquipment'
import { DeviceAddSchema, type DeviceAdd, type ObjectDevice } from '../../types/equipment'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { FormTextField } from '../common/FormTextField'

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
  const [removeDevice_, setRemoveDevice] = useState<ObjectDevice | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const availableDeviceTypes = catalogDevices.filter(
    (ct) => !devices.some((d) => d.deviceTypeId === ct.id)
  )

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
      const code = (err as { response?: { data?: { error?: { code?: string } } } }).response?.data
        ?.error?.code
      setMutationError(code ?? 'An error occurred while adding the device.')
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
      const code = (err as { response?: { data?: { error?: { code?: string } } } }).response?.data
        ?.error?.code
      setMutationError(code ?? 'An error occurred while updating the device.')
    }
  }

  async function handleConfirmRemove() {
    if (!removeDevice_) return
    try {
      await removeDevice.mutateAsync(removeDevice_.deviceTypeId)
      setRemoveDevice(null)
    } catch (err) {
      const code = (err as { response?: { data?: { error?: { code?: string } } } }).response?.data
        ?.error?.code
      setMutationError(code ?? 'An error occurred while removing the device.')
      setRemoveDevice(null)
    }
  }

  if (isLoading) {
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
          One or more devices have assignments where quantity maintained exceeds quantity physical.
        </Alert>
      )}

      <Table size="small" aria-label="physical inventory table">
        <TableHead>
          <TableRow>
            <TableCell>Device Type</TableCell>
            <TableCell>Qty Physical</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {devices.map((device) => (
            <TableRow key={device.id}>
              <TableCell>{device.deviceTypeName}</TableCell>
              <TableCell>{device.quantityPhysical}</TableCell>
              <TableCell align="right">
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
                  onClick={() => setRemoveDevice(device)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          {devices.length === 0 && (
            <TableRow>
              <TableCell colSpan={3}>
                <Typography variant="body2" color="text.secondary">
                  No devices in inventory.
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Button sx={{ mt: 1 }} onClick={handleOpenAdd} variant="outlined" size="small">
        Add device
      </Button>

      {/* Add Device Dialog */}
      <Dialog open={addOpen} onClose={handleCloseAdd} maxWidth="xs" fullWidth>
        <DialogTitle>Add Device</DialogTitle>
        <form
          onSubmit={(e) => {
            void addForm.handleSubmit(handleSubmitAdd)(e)
          }}
        >
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Controller
              name="deviceTypeId"
              control={addForm.control}
              render={({ field, fieldState }) => (
                <Box>
                  <Typography variant="caption">Device Type</Typography>
                  <Select
                    {...field}
                    fullWidth
                    displayEmpty
                    size="small"
                    error={!!fieldState.error}
                    inputProps={{ 'aria-label': 'Device Type' }}
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
                  {fieldState.error && (
                    <Typography variant="caption" color="error">
                      {fieldState.error.message}
                    </Typography>
                  )}
                </Box>
              )}
            />
            <FormTextField
              name="quantityPhysical"
              control={addForm.control}
              label="Quantity Physical"
              type="number"
              size="small"
              inputProps={{ min: 1 }}
              fullWidth
              onChange={(e) =>
                addForm.setValue('quantityPhysical', parseInt(e.target.value, 10) || 1)
              }
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAdd}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={addDevice.isPending}>
              Add
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit Device Dialog */}
      <Dialog open={!!editDevice} onClose={handleCloseEdit} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Device — {editDevice?.deviceTypeName}</DialogTitle>
        <form
          onSubmit={(e) => {
            void editForm.handleSubmit(handleSubmitEdit)(e)
          }}
        >
          <DialogContent sx={{ pt: 1 }}>
            <FormTextField
              name="quantityPhysical"
              control={editForm.control}
              label="Quantity Physical"
              type="number"
              size="small"
              inputProps={{ min: 1 }}
              fullWidth
              onChange={(e) =>
                editForm.setValue('quantityPhysical', parseInt(e.target.value, 10) || 1)
              }
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEdit}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={updateDevice.isPending}>
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Remove Confirm Dialog */}
      <ConfirmDialog
        open={!!removeDevice_}
        title="Remove Device?"
        message={`Remove "${removeDevice_?.deviceTypeName}" from the inventory? All assignments for this device will also be removed.`}
        onConfirm={() => void handleConfirmRemove()}
        onCancel={() => setRemoveDevice(null)}
        confirmLabel="Remove"
      />
    </Box>
  )
}
