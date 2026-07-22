import { useEffect } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { FormTextField } from '../common/FormTextField'
import { useCatalogRepairs } from '../../hooks/useCatalog'
import { useRepairs, useUpdateRepair } from '../../hooks/useRepairs'
import { RepairUpdateSchema, type RepairUpdate } from '../../types/repairs'
import type { RepairType } from '../../types/catalog'
import type { ObjectRepair } from '../../types/repairs'
import { handleFormError } from '../../utils/errorMessages'
import { showNotification } from '../../stores/notificationStore'
import { useState } from 'react'

function getCount(repairs: ObjectRepair[], repairTypeId: string): number {
  return repairs.find((r) => r.repairTypeId === repairTypeId)?.count ?? 0
}

function RepairRow({
  repairType,
  initialCount,
  objectId,
  onSaveSuccess,
  onSaveError,
}: {
  repairType: RepairType
  initialCount: number
  objectId: string
  onSaveSuccess: () => void
  onSaveError: (err: unknown) => void
}) {
  const updateMutation = useUpdateRepair(objectId)

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<RepairUpdate>({
    resolver: zodResolver(RepairUpdateSchema),
    defaultValues: { count: initialCount },
  })

  useEffect(() => {
    reset({ count: initialCount })
  }, [initialCount, reset])

  const onSubmit = handleSubmit(async (data) => {
    try {
      await updateMutation.mutateAsync({ repairTypeId: repairType.id, data: { count: data.count } })
      onSaveSuccess()
    } catch (err) {
      onSaveError(err)
    }
  })

  return (
    <TableRow>
      <TableCell>{repairType.name}</TableCell>
      <TableCell>{repairType.timeMinutes}</TableCell>
      <TableCell>
        <FormTextField
          name="count"
          control={control}
          label=""
          type="number"
          size="small"
          inputProps={{ 'aria-label': `count-${repairType.name}`, min: 0 }}
          sx={{ width: 100 }}
        />
      </TableCell>
      <TableCell>
        <Button
          variant="contained"
          size="small"
          disabled={isSubmitting || updateMutation.isPending}
          onClick={() => {
            void onSubmit()
          }}
        >
          Save
        </Button>
      </TableCell>
    </TableRow>
  )
}

export function RepairsTab({ objectId }: { objectId: string }) {
  const { data: catalogRepairs, isLoading: catalogLoading } = useCatalogRepairs()
  const { data: repairs, isLoading: repairsLoading } = useRepairs(objectId)
  const [submitError, setSubmitError] = useState<string | null>(null)

  if (catalogLoading || repairsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  const repairList = repairs ?? []

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Repairs
      </Typography>
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      )}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Repair Type</TableCell>
            <TableCell>Time (min)</TableCell>
            <TableCell>Count</TableCell>
            <TableCell>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(catalogRepairs ?? []).map((repairType) => (
            <RepairRow
              key={repairType.id}
              repairType={repairType}
              initialCount={getCount(repairList, repairType.id)}
              objectId={objectId}
              onSaveSuccess={() => {
                setSubmitError(null)
                showNotification('Repairs saved successfully.', 'success')
              }}
              onSaveError={(err) => handleFormError(err, setSubmitError)}
            />
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}
