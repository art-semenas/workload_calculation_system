import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Autocomplete,
  TextField,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material'
import { useObjects } from '../../hooks/useObjects'
import { handleFormError } from '../../utils/errorMessages'

interface EngineerAssignDialogProps {
  open: boolean
  onClose: () => void
  onAssign: (objectId: string) => Promise<void>
  isAssigning: boolean
}

export default function EngineerAssignDialog({
  open,
  onClose,
  onAssign,
  isAssigning,
}: EngineerAssignDialogProps) {
  const { data: objects = [], isLoading } = useObjects()
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAssign = async () => {
    if (!selectedObjectId) return
    setError(null)
    try {
      await onAssign(selectedObjectId)
      setSelectedObjectId(null)
      onClose()
    } catch (err) {
      handleFormError(err, setError)
    }
  }

  const handleClose = () => {
    setSelectedObjectId(null)
    setError(null)
    onClose()
  }

  const objectOptions = objects.map((obj) => ({
    id: obj.id,
    label: `${obj.name}${obj.division_name ? ` — ${obj.division_name}` : ''}`,
  }))

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Assign Object to Engineer</DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Autocomplete
              options={objectOptions}
              getOptionLabel={(option) => option.label}
              value={
                selectedObjectId
                  ? objectOptions.find((obj) => obj.id === selectedObjectId) || null
                  : null
              }
              onChange={(_, option) => setSelectedObjectId(option?.id || null)}
              renderInput={(params) => (
                <TextField {...params} label="Select Object" margin="normal" />
              )}
              disabled={isAssigning}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isAssigning}>
          Cancel
        </Button>
        <Button
          onClick={() => void handleAssign()}
          disabled={!selectedObjectId || isAssigning}
          variant="contained"
        >
          {isAssigning ? <CircularProgress size={20} /> : 'Assign'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
