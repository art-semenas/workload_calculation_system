import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { QuietDialog } from './QuietDialog'
import { FormTextField } from '../common/FormTextField'
import { useCreateDivision } from '../../hooks/useDivisions'
import { DivisionCreateSchema, type DivisionCreate } from '../../types/division'
import { handleFormError } from '../../utils/errorMessages'
import { tokens } from '../../theme'

interface CreateDivisionDialogProps {
  open: boolean
  onClose: () => void
}

export function CreateDivisionDialog({ open, onClose }: CreateDivisionDialogProps) {
  const createDivision = useCreateDivision()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { control, handleSubmit, reset } = useForm<DivisionCreate>({
    resolver: zodResolver(DivisionCreateSchema),
    defaultValues: { name: '' },
  })

  const handleClose = () => {
    reset()
    setSubmitError(null)
    onClose()
  }

  const onSubmit = handleSubmit(async (data) => {
    setSubmitError(null)
    try {
      await createDivision.mutateAsync(data)
      handleClose()
    } catch (error) {
      handleFormError(error, setSubmitError)
    }
  })

  return (
    <QuietDialog open={open} onClose={handleClose} paperWidth={480}>
      <DialogTitle sx={{ position: 'relative', pb: 1 }}>
        <Typography sx={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em' }}>
          Create division
        </Typography>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{ position: 'absolute', right: 8, top: 8, color: tokens.ink3 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Box
        component="form"
        onSubmit={(e) => {
          void onSubmit(e)
        }}
      >
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}
          <FormTextField name="name" control={control} label="Division name" fullWidth autoFocus />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
            Code is auto-derived from name
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createDivision.isPending}>
              Create division
            </Button>
          </Box>
        </DialogActions>
      </Box>
    </QuietDialog>
  )
}
