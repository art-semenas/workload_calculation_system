import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useState } from 'react'
import { QuietDialog } from './QuietDialog'
import { FormTextField } from '../common/FormTextField'
import { useDivisions } from '../../hooks/useDivisions'
import { useCreateEngineer } from '../../hooks/useEngineers'
import { EngineerCreateSchema, type EngineerCreateRequest } from '../../types/engineer'
import { tokens } from '../../theme'

interface CreateEngineerDialogProps {
  open: boolean
  onClose: () => void
}

export function CreateEngineerDialog({ open, onClose }: CreateEngineerDialogProps) {
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(false)
  const { data: divisions, isLoading: divisionsLoading } = useDivisions()
  const createMutation = useCreateEngineer()

  const { control, handleSubmit, reset } = useForm<EngineerCreateRequest>({
    resolver: zodResolver(EngineerCreateSchema),
    defaultValues: { name: '', email: '', password: '', capacityFte: 1, homeDivisionId: '' },
  })

  const handleClose = () => {
    reset()
    setSendWelcomeEmail(false)
    onClose()
  }

  const onSubmit = handleSubmit(async (data) => {
    await createMutation.mutateAsync(data)
    handleClose()
  })

  return (
    <QuietDialog open={open} onClose={handleClose} paperWidth={520}>
      <DialogTitle sx={{ position: 'relative', pb: 1 }}>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.02em',
            color: tokens.ink3,
            mb: 0.5,
          }}
        >
          New engineer
        </Typography>
        <Typography sx={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em' }}>
          Create engineer
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
          {createMutation.isError && (
            <Alert severity="error">
              {createMutation.error instanceof Error
                ? createMutation.error.message
                : 'Failed to create engineer'}
            </Alert>
          )}
          <FormTextField name="name" control={control} label="Name" fullWidth autoFocus />
          <FormTextField name="email" control={control} label="Email" fullWidth type="email" />
          <FormTextField
            name="password"
            control={control}
            label="Password"
            fullWidth
            type="password"
            helperText="Min 8 characters · engineer must change on first sign-in"
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormTextField
                name="capacityFte"
                control={control}
                label="Capacity FTE"
                fullWidth
                type="number"
                inputProps={{ step: 0.01, min: 0 }}
              />
            </Grid>
            <Grid item xs={6}>
              <Controller
                name="homeDivisionId"
                control={control}
                render={({ field, fieldState }) => (
                  <FormControl fullWidth error={!!fieldState.error}>
                    <InputLabel>Division</InputLabel>
                    <Select {...field} label="Division" displayEmpty disabled={divisionsLoading}>
                      <MenuItem value="">Select a division</MenuItem>
                      {divisions?.map((div) => (
                        <MenuItem key={div.id} value={div.id}>
                          {div.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {fieldState.error && (
                      <Typography color="error" variant="caption" sx={{ mt: 0.5 }}>
                        {fieldState.error.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={sendWelcomeEmail}
                onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                size="small"
              />
            }
            label={<Typography sx={{ fontSize: 13 }}>Send welcome email</Typography>}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              Create engineer
            </Button>
          </Box>
        </DialogActions>
      </Box>
    </QuietDialog>
  )
}
