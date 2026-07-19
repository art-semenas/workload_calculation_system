import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { QuietDialog } from './QuietDialog'
import CloseIcon from '@mui/icons-material/Close'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import { getDivisionBranches } from '../../api/divisions'
import { FormTextField } from '../common/FormTextField'
import { useCreateObject } from '../../hooks/useObjects'
import { useDivisions } from '../../hooks/useDivisions'
import { ObjectCreateSchema, type ObjectCreate } from '../../types/object'
import { handleFormError } from '../../utils/errorMessages'
import { tokens } from '../../theme'

// PoC (S-02): MVP M-06 will add Tier, Travel norm, Visits/year, and auto-assigned Object ID.
// Until then the disabled placeholders only confuse users — hide them.
const SHOW_FUTURE_FIELDS = false

interface CreateObjectDialogProps {
  open: boolean
  onClose: () => void
}

interface BranchOption {
  divisionId: string
  divisionName: string
  branchId: string
  branchName: string
}

export function CreateObjectDialog({ open, onClose }: CreateObjectDialogProps) {
  const { data: divisions = [] } = useDivisions()
  const createObject = useCreateObject()

  // Fetch branches for all divisions when dialog is open
  const divisionQueries = useQueries({
    queries: open
      ? divisions.map((div) => ({
          queryKey: ['divisions', div.id, 'branches'],
          queryFn: () => getDivisionBranches(div.id),
        }))
      : [],
  })

  // Build grouped branch options
  const branchOptions = useMemo(() => {
    const options: BranchOption[] = []
    divisionQueries.forEach((query, idx) => {
      const division = divisions[idx]
      if (query.data && division) {
        query.data.forEach((branch) => {
          options.push({
            divisionId: division.id,
            divisionName: division.name,
            branchId: branch.id,
            branchName: branch.name,
          })
        })
      }
    })
    return options
  }, [divisionQueries, divisions])

  const [submitError, setSubmitError] = useState<string | null>(null)

  const { control, handleSubmit, reset } = useForm<ObjectCreate>({
    resolver: zodResolver(ObjectCreateSchema),
    defaultValues: {
      name: '',
      branchId: '',
      address: '',
    },
  })

  const handleClose = () => {
    reset()
    setSubmitError(null)
    onClose()
  }

  const handleCreate = handleSubmit(async (formData) => {
    setSubmitError(null)
    try {
      await createObject.mutateAsync(formData)
      handleClose()
    } catch (error) {
      handleFormError(error, setSubmitError)
    }
  })

  return (
    <QuietDialog open={open} onClose={handleClose} paperWidth={560}>
      {/* Title Section with Eyebrow */}
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
          New object
        </Typography>
        <Typography sx={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em' }}>
          Create object
        </Typography>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{ position: 'absolute', right: 8, top: 8, color: tokens.ink3 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Form wraps both content and actions so type="submit" button works */}
      <Box
        component="form"
        onSubmit={(e) => {
          void handleCreate(e)
        }}
      >
        {/* Form Content */}
        <DialogContent sx={{ pt: 3 }}>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}
          <Grid container spacing={2}>
            {/* Object Name — full width */}
            <Grid item xs={12}>
              <FormTextField
                name="name"
                control={control}
                label="Object name"
                fullWidth
                autoFocus
              />
            </Grid>

            {/* Branch Select — full width (grouped select is wide) */}
            <Grid item xs={12}>
              <Controller
                name="branchId"
                control={control}
                rules={{ required: 'Branch is required' }}
                render={({ field, fieldState: { error } }) => (
                  <FormControl fullWidth error={!!error} data-testid="dialog-branch-select-btn">
                    <InputLabel>Branch</InputLabel>
                    <Select {...field} label="Branch">
                      <MenuItem value="" disabled>
                        Select branch
                      </MenuItem>
                      {divisions.map((div) => [
                        <ListSubheader key={`subheader-${div.id}`}>{div.name}</ListSubheader>,
                        ...branchOptions
                          .filter((opt) => opt.divisionId === div.id)
                          .map((opt) => (
                            <MenuItem key={opt.branchId} value={opt.branchId}>
                              {opt.branchName}
                            </MenuItem>
                          )),
                      ])}
                    </Select>
                    {error && <FormHelperText>{error.message}</FormHelperText>}
                  </FormControl>
                )}
              />
            </Grid>

            {/* Address — full width */}
            <Grid item xs={12}>
              <FormTextField name="address" control={control} label="Address" fullWidth optional />
            </Grid>

            {SHOW_FUTURE_FIELDS && (
              <>
                {/* Division Select — display-only, disabled */}
                <Grid item xs={12}>
                  <FormControl fullWidth disabled>
                    <InputLabel>Division</InputLabel>
                    <Select value="" label="Division">
                      <MenuItem value="">—</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Tier + Object ID side-by-side */}
                <Grid item xs={6}>
                  <FormControl fullWidth disabled>
                    <InputLabel>Tier</InputLabel>
                    <Select value="" label="Tier">
                      <MenuItem value="">—</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Object ID"
                    value=""
                    disabled
                    fullWidth
                    placeholder="Auto-assigned"
                    inputProps={{ style: { fontFamily: "'JetBrains Mono', monospace" } }}
                  />
                </Grid>

                {/* Travel norm + Visits/year side-by-side */}
                <Grid item xs={6}>
                  <TextField
                    label="Travel norm h"
                    disabled
                    fullWidth
                    placeholder="Coming soon"
                    inputProps={{ style: { fontFamily: "'JetBrains Mono', monospace" } }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Visits / year"
                    disabled
                    fullWidth
                    placeholder="Coming soon"
                    inputProps={{ style: { fontFamily: "'JetBrains Mono', monospace" } }}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>

        {/* Footer with Hint and Actions */}
        <DialogActions
          sx={{
            p: 2,
            gap: 1,
            justifyContent: 'space-between',
            '& > :first-of-type': {
              mr: 'auto',
            },
          }}
        >
          <Typography sx={{ fontSize: 12, color: tokens.ink3, flex: 1 }}>
            Equipment & assignments are added after creation
          </Typography>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={createObject.isPending}>
            Create object
          </Button>
        </DialogActions>
      </Box>
    </QuietDialog>
  )
}
