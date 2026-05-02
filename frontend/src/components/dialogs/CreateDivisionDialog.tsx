import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
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
import { tokens } from '../../theme'

interface CreateDivisionDialogProps {
  open: boolean
  onClose: () => void
}

export function CreateDivisionDialog({ open, onClose }: CreateDivisionDialogProps) {
  const createDivision = useCreateDivision()

  const { control, handleSubmit, reset } = useForm<DivisionCreate>({
    resolver: zodResolver(DivisionCreateSchema),
    defaultValues: { name: '' },
  })

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = handleSubmit(async (data) => {
    await createDivision.mutateAsync(data)
    handleClose()
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
        <DialogContent sx={{ pt: 1 }}>
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
