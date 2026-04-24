import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Button, CircularProgress, Snackbar, Alert, Stack, Typography } from '@mui/material'
import { RecordsUpdateSchema } from '../../types/records'
import type { RecordsUpdate } from '../../types/records'
import { useRecords, useUpdateRecords } from '../../hooks/useRecords'
import { FormTextField } from '../common/FormTextField'
import { extractErrorCode, mapSaveErrorCode } from '../../utils/errorMessages'

export function RecordsTab({ objectId }: { objectId: string }) {
  const { data, isLoading } = useRecords(objectId)
  const updateMutation = useUpdateRecords(objectId)
  const [successOpen, setSuccessOpen] = useState(false)
  const [errorOpen, setErrorOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('Failed to save records.')

  const { control, handleSubmit, reset } = useForm<RecordsUpdate>({
    resolver: zodResolver(RecordsUpdateSchema),
    defaultValues: {
      accessRequests: 0,
      monitoringRequests: 0,
      footageRequests: 0,
      backupControl: 0,
      securityAdmin: 0,
    },
  })

  useEffect(() => {
    if (data) {
      reset({
        accessRequests: data.accessRequests,
        monitoringRequests: data.monitoringRequests,
        footageRequests: data.footageRequests,
        backupControl: data.backupControl,
        securityAdmin: data.securityAdmin,
      })
    }
  }, [data, reset])

  const onValid = async (values: RecordsUpdate) => {
    try {
      await updateMutation.mutateAsync(values)
      setSuccessOpen(true)
    } catch (err) {
      setErrorMessage(mapSaveErrorCode(extractErrorCode(err)))
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
        Records
      </Typography>
      <Stack spacing={2} sx={{ maxWidth: 400 }}>
        <FormTextField
          name="accessRequests"
          control={control}
          label="Access Requests"
          type="number"
          inputProps={{ min: 0 }}
        />
        <FormTextField
          name="monitoringRequests"
          control={control}
          label="Monitoring Requests"
          type="number"
          inputProps={{ min: 0 }}
        />
        <FormTextField
          name="footageRequests"
          control={control}
          label="Footage Requests"
          type="number"
          inputProps={{ min: 0 }}
        />
        <FormTextField
          name="backupControl"
          control={control}
          label="Backup Control"
          type="number"
          inputProps={{ min: 0 }}
        />
        <FormTextField
          name="securityAdmin"
          control={control}
          label="Security Admin"
          type="number"
          inputProps={{ min: 0 }}
        />
        <Button type="submit" variant="contained" disabled={updateMutation.isPending}>
          Save
        </Button>
      </Stack>
      <Snackbar open={successOpen} autoHideDuration={3000} onClose={() => setSuccessOpen(false)}>
        <Alert severity="success" onClose={() => setSuccessOpen(false)}>
          Records saved successfully.
        </Alert>
      </Snackbar>
      <Snackbar open={errorOpen} autoHideDuration={3000} onClose={() => setErrorOpen(false)}>
        <Alert severity="error" onClose={() => setErrorOpen(false)}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}
