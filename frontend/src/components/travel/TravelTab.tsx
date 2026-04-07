import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Button, CircularProgress, Snackbar, Alert, Stack, Typography } from '@mui/material'
import { TravelUpdateSchema } from '../../types/travel'
import type { TravelUpdate } from '../../types/travel'
import { useTravel, useUpdateTravel } from '../../hooks/useTravel'
import { FormTextField } from '../common/FormTextField'

export function TravelTab({ objectId }: { objectId: string }) {
  const { data, isLoading } = useTravel(objectId)
  const updateMutation = useUpdateTravel(objectId)
  const [successOpen, setSuccessOpen] = useState(false)
  const [errorOpen, setErrorOpen] = useState(false)

  const { control, handleSubmit, reset } = useForm<TravelUpdate>({
    resolver: zodResolver(TravelUpdateSchema),
    defaultValues: {
      transportType: '',
      distanceKm: 0,
      oneWayTimeMin: 0,
    },
  })

  useEffect(() => {
    if (data) {
      reset({
        transportType: data.transportType,
        distanceKm: data.distanceKm,
        oneWayTimeMin: data.oneWayTimeMin,
      })
    }
  }, [data, reset])

  const onValid = async (values: TravelUpdate) => {
    try {
      await updateMutation.mutateAsync(values)
      setSuccessOpen(true)
    } catch {
      setErrorOpen(true)
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        void handleSubmit(onValid)(e)
      }}
    >
      <Typography variant="h6" gutterBottom>
        Travel
      </Typography>
      <Stack spacing={2} sx={{ maxWidth: 400 }}>
        <FormTextField name="transportType" control={control} label="Transport Type" />
        <FormTextField
          name="distanceKm"
          control={control}
          label="Distance (km)"
          type="number"
          inputProps={{ min: 0 }}
        />
        <FormTextField
          name="oneWayTimeMin"
          control={control}
          label="One-Way Time (min)"
          type="number"
          inputProps={{ min: 0 }}
        />
        {data != null && (
          <Typography variant="body2" color="text.secondary">
            Round Trip: {data.roundTripMin} min
          </Typography>
        )}
        <Button type="submit" variant="contained" disabled={updateMutation.isPending}>
          Save
        </Button>
      </Stack>
      <Snackbar open={successOpen} autoHideDuration={3000} onClose={() => setSuccessOpen(false)}>
        <Alert severity="success" onClose={() => setSuccessOpen(false)}>
          Travel saved successfully.
        </Alert>
      </Snackbar>
      <Snackbar open={errorOpen} autoHideDuration={3000} onClose={() => setErrorOpen(false)}>
        <Alert severity="error" onClose={() => setErrorOpen(false)}>
          Failed to save travel.
        </Alert>
      </Snackbar>
    </Box>
  )
}
