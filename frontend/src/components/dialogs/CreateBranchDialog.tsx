import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { QuietDialog } from './QuietDialog'
import { FormTextField } from '../common/FormTextField'
import { useCreateBranch } from '../../hooks/useDivisions'
import { BranchCreateSchema, type BranchCreate } from '../../types/division'
import { tokens } from '../../theme'

interface CreateBranchDialogProps {
  open: boolean
  onClose: () => void
  /** Pre-selected division — passed from DivisionDetailPage context */
  divisionId: string
  divisionName: string
}

export function CreateBranchDialog({
  open,
  onClose,
  divisionId,
  divisionName,
}: CreateBranchDialogProps) {
  const createBranch = useCreateBranch(divisionId)

  const { control, handleSubmit, reset } = useForm<BranchCreate>({
    resolver: zodResolver(BranchCreateSchema),
    defaultValues: { name: '' },
  })

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = handleSubmit(async (data) => {
    await createBranch.mutateAsync(data)
    handleClose()
  })

  return (
    <QuietDialog open={open} onClose={handleClose} paperWidth={480}>
      <DialogTitle sx={{ position: 'relative', pb: 1 }}>
        <Typography sx={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em' }}>
          Create branch
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
          {createBranch.isError && (
            <Alert severity="error">
              {createBranch.error instanceof Error
                ? createBranch.error.message
                : 'Failed to create branch'}
            </Alert>
          )}
          <FormTextField name="name" control={control} label="Branch name" fullWidth autoFocus />
          <FormControl fullWidth disabled>
            <InputLabel>Division</InputLabel>
            <Select value={divisionId} label="Division">
              <MenuItem value={divisionId}>{divisionName}</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
            Branch №/ID is auto-assigned
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createBranch.isPending}>
              Create branch
            </Button>
          </Box>
        </DialogActions>
      </Box>
    </QuietDialog>
  )
}
