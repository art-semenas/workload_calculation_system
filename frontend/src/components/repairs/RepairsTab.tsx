import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useCatalogRepairs } from '../../hooks/useCatalog'
import { useRepairs, useUpdateRepair } from '../../hooks/useRepairs'
import type { RepairType } from '../../types/catalog'
import type { ObjectRepair } from '../../types/repairs'

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
  onSaveError: () => void
}) {
  const [countStr, setCountStr] = useState(String(initialCount))
  const [error, setError] = useState<string | null>(null)
  const updateMutation = useUpdateRepair(objectId)

  useEffect(() => {
    setCountStr(String(initialCount))
  }, [initialCount])

  const handleSave = async () => {
    const parsed = Number(countStr)
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError('Must be a non-negative integer')
      return
    }
    setError(null)
    try {
      await updateMutation.mutateAsync({ repairTypeId: repairType.id, data: { count: parsed } })
      onSaveSuccess()
    } catch {
      setError('Failed to save.')
      onSaveError()
    }
  }

  return (
    <TableRow>
      <TableCell>{repairType.name}</TableCell>
      <TableCell>{repairType.timeMinutes}</TableCell>
      <TableCell>
        <TextField
          value={countStr}
          onChange={(e) => setCountStr(e.target.value)}
          inputProps={{ 'aria-label': `count-${repairType.name}` }}
          type="number"
          size="small"
          error={!!error}
          helperText={error ?? undefined}
          sx={{ width: 100 }}
        />
      </TableCell>
      <TableCell>
        <Button
          variant="contained"
          size="small"
          disabled={updateMutation.isPending}
          onClick={() => {
            void handleSave()
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
  const [successOpen, setSuccessOpen] = useState(false)
  const [errorOpen, setErrorOpen] = useState(false)

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
              onSaveSuccess={() => setSuccessOpen(true)}
              onSaveError={() => setErrorOpen(true)}
            />
          ))}
        </TableBody>
      </Table>
      <Snackbar open={successOpen} autoHideDuration={3000} onClose={() => setSuccessOpen(false)}>
        <Alert severity="success" onClose={() => setSuccessOpen(false)}>
          Repairs saved successfully.
        </Alert>
      </Snackbar>
      <Snackbar open={errorOpen} autoHideDuration={3000} onClose={() => setErrorOpen(false)}>
        <Alert severity="error" onClose={() => setErrorOpen(false)}>
          Failed to save repairs.
        </Alert>
      </Snackbar>
    </Box>
  )
}
