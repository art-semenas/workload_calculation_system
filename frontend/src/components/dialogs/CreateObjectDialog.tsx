import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import { getDivisionBranches } from '../../api/divisions'
import { FormTextField } from '../common/FormTextField'
import { useCreateObject } from '../../hooks/useObjects'
import { useDivisions } from '../../hooks/useDivisions'
import { ObjectCreateSchema, type ObjectCreate } from '../../types/object'
import { tokens } from '../../theme'

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

export default function CreateObjectDialog({ open, onClose }: CreateObjectDialogProps) {
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
    onClose()
  }

  const handleCreate = handleSubmit(async (formData) => {
    await createObject.mutateAsync(formData)
    handleClose()
  })

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      sx={{
        '& .MuiDialog-paper': {
          width: 560,
          borderRadius: 'var(--r-lg)',
          border: '1px solid var(--line-strong)',
        },
      }}
    >
      {/* Title Section with Eyebrow */}
      <DialogTitle sx={{ pb: 0 }}>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: tokens.ink3,
            mb: 1,
          }}
        >
          New object
        </Typography>
        <Typography
          sx={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: tokens.ink,
            m: 0,
          }}
        >
          Create object
        </Typography>
      </DialogTitle>

      {/* Form Content */}
      <DialogContent sx={{ pt: 3 }}>
        <Box
          component="form"
          onSubmit={(e) => {
            void handleCreate(e)
          }}
        >
          <Grid container spacing={2}>
            {/* Object Name */}
            <Grid item xs={12}>
              <FormTextField
                name="name"
                control={control}
                label="Object name"
                fullWidth
                autoFocus
              />
            </Grid>

            {/* Branch Select */}
            <Grid item xs={12}>
              <Controller
                name="branchId"
                control={control}
                rules={{ required: 'Branch is required' }}
                render={({ field, fieldState: { error } }) => (
                  <FormControl fullWidth error={!!error}>
                    <InputLabel>Branch</InputLabel>
                    <Select {...field} label="Branch">
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

            {/* Address */}
            <Grid item xs={12}>
              <FormTextField
                name="address"
                control={control}
                label="Address"
                fullWidth
                optional
              />
            </Grid>

            {/* Tier (Disabled - Future Scope) */}
            <Grid item xs={12}>
              <TextField
                label="Tier"
                fullWidth
                disabled
                helperText="coming soon"
                defaultValue=""
              />
            </Grid>

            {/* Travel Norm (Disabled - Future Scope) */}
            <Grid item xs={12}>
              <TextField
                label="Travel norm"
                fullWidth
                disabled
                defaultValue=""
                helperText="coming soon"
              />
            </Grid>

            {/* Visits/Year (Disabled - Future Scope) */}
            <Grid item xs={12}>
              <TextField
                label="Visits/year"
                fullWidth
                disabled
                defaultValue=""
                helperText="coming soon"
              />
            </Grid>
          </Grid>
        </Box>
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
        <Button
          type="submit"
          variant="contained"
          disabled={createObject.isPending}
          onClick={(e) => {
            void handleCreate(e)
          }}
        >
          Create object
        </Button>
      </DialogActions>
    </Dialog>
  )
}
