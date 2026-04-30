import { useState, useMemo } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  FormControl,
  InputLabel,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import CancelIcon from '@mui/icons-material/Cancel'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEngineers, useCreateEngineer } from '../hooks/useEngineers'
import { useDivisions } from '../hooks/useDivisions'
import { FormTextField } from '../components/common/FormTextField'
import { PageHead } from '../components/common/PageHead'
import { DistBar } from '../components/common/DistBar'
import { CapBar } from '../components/common/CapBar'
import {
  EngineerCreateSchema,
  type EngineerCreateRequest,
  type EngineerStatus,
} from '../types/engineer'

export default function EngineerListPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [divisionFilter, setDivisionFilter] = useState<string>('')
  const [nameSearch, setNameSearch] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const statusFilterValue = statusFilter === '' ? undefined : statusFilter

  const { data: engineers, isLoading: engineersLoading } = useEngineers(
    statusFilterValue,
    divisionFilter || undefined
  )
  const { data: divisions, isLoading: divisionsLoading } = useDivisions()
  const createMutation = useCreateEngineer()

  const { control, handleSubmit, reset } = useForm<EngineerCreateRequest>({
    resolver: zodResolver(EngineerCreateSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      capacityFte: 1.0,
      homeDivisionId: '',
    },
  })

  const filteredEngineers = useMemo(() => {
    if (!engineers) return []
    return engineers.filter((e) => e.name.toLowerCase().includes(nameSearch.toLowerCase()))
  }, [engineers, nameSearch])

  const distBarSegments = useMemo(() => {
    const normal = filteredEngineers.filter((e) => e.status === 'NORMAL').length
    const warn = filteredEngineers.filter((e) => e.status === 'WARNING').length
    const overloaded = filteredEngineers.filter((e) => e.status === 'OVERLOADED').length
    return [
      { tone: 'ok' as const, count: normal, label: 'Normal' },
      { tone: 'warn' as const, count: warn, label: 'Watch' },
      { tone: 'danger' as const, count: overloaded, label: 'Overloaded' },
    ]
  }, [filteredEngineers])

  const handleDialogClose = () => {
    setDialogOpen(false)
    reset()
  }

  const handleCreateEngineer = handleSubmit(async (formData) => {
    try {
      await createMutation.mutateAsync(formData)
      handleDialogClose()
    } catch {
      // Error displayed via createMutation.isError
    }
  })

  const getStatusChipColor = (status: EngineerStatus) => {
    switch (status) {
      case 'NORMAL':
        return 'success'
      case 'WARNING':
        return 'warning'
      case 'OVERLOADED':
        return 'error'
      default:
        return 'default'
    }
  }

  const getStatusChipIcon = (status: EngineerStatus) => {
    switch (status) {
      case 'NORMAL':
        return <CheckCircleIcon />
      case 'WARNING':
        return <WarningIcon />
      case 'OVERLOADED':
        return <CancelIcon />
      default:
        return <CheckCircleIcon />
    }
  }

  if (engineersLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <PageHead
        crumbs={[{ label: 'Workload', to: '/' }, { label: 'Engineers' }]}
        title="Engineers"
        actions={
          <Button variant="contained" onClick={() => setDialogOpen(true)}>
            Create engineer
          </Button>
        }
      />

      {/* Filter Bar */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Select
          value={divisionFilter}
          onChange={(e) => setDivisionFilter(e.target.value)}
          displayEmpty
          sx={{ minWidth: 200 }}
          disabled={divisionsLoading}
        >
          <MenuItem value="">All divisions</MenuItem>
          {divisions?.map((div) => (
            <MenuItem key={div.id} value={div.id}>
              {div.name}
            </MenuItem>
          ))}
        </Select>

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          displayEmpty
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          <MenuItem value="NORMAL">Normal</MenuItem>
          <MenuItem value="WARNING">Warning</MenuItem>
          <MenuItem value="OVERLOADED">Overloaded</MenuItem>
        </Select>

        <TextField
          placeholder="Search by name..."
          value={nameSearch}
          onChange={(e) => setNameSearch(e.target.value)}
          size="small"
          sx={{ minWidth: 200 }}
        />
      </Box>

      {/* Capacity distribution bar */}
      {filteredEngineers.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <DistBar segments={distBarSegments} />
        </Box>
      )}

      {/* Engineers Table */}
      {filteredEngineers.length > 0 ? (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="left">Engineer</TableCell>
                <TableCell align="left">Division</TableCell>
                <TableCell align="right">Objects</TableCell>
                <TableCell align="left">Utilisation</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEngineers.map((engineer) => (
                <TableRow
                  key={engineer.id}
                  hover
                  onClick={() => navigate(`/engineers/${engineer.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell align="left">
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>
                        {engineer.name}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.3 }}>
                        {engineer.email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="left">{engineer.homeDivisionName || '—'}</TableCell>
                  <TableCell align="right">{engineer.objectCount ?? '—'}</TableCell>
                  <TableCell align="left" sx={{ minWidth: 120 }}>
                    {engineer.loadRatio != null ? (
                      <CapBar pct={engineer.loadRatio} />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {engineer.loadRatio != null && engineer.status ? (
                      <Chip
                        label={`${Math.round(engineer.loadRatio * 100)}%`}
                        color={getStatusChipColor(engineer.status)}
                        icon={getStatusChipIcon(engineer.status)}
                        size="small"
                      />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <Typography color="text.secondary">No engineers found</Typography>
      )}

      {/* Create Engineer Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} fullWidth maxWidth="sm">
        <DialogTitle>Create engineer</DialogTitle>
        <Box
          component="form"
          onSubmit={(e) => {
            void handleCreateEngineer(e)
          }}
        >
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
              helperText="Minimum 8 characters"
            />
            <FormTextField
              name="capacityFte"
              control={control}
              label="Capacity FTE"
              fullWidth
              type="number"
              inputProps={{ step: 0.01, min: 0 }}
            />
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
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              Create
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  )
}
