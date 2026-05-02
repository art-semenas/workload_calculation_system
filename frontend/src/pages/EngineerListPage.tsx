import { useState, useMemo } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
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
  FormControl,
  InputLabel,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import CancelIcon from '@mui/icons-material/Cancel'
import SearchIcon from '@mui/icons-material/Search'
import { useNavigate } from 'react-router-dom'
import { tokens } from '../theme'
import { useEngineers } from '../hooks/useEngineers'
import { useDivisions } from '../hooks/useDivisions'
import { PageHead } from '../components/common/PageHead'
import { DistBar } from '../components/common/DistBar'
import { CapBar } from '../components/common/CapBar'
import { CreateEngineerDialog } from '../components/dialogs/CreateEngineerDialog'
import type { EngineerStatus } from '../types/engineer'

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

      {/* Filter Row */}
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          mb: 3,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <TextField
          placeholder="Search by name..."
          aria-label="Search engineers"
          value={nameSearch}
          onChange={(e) => setNameSearch(e.target.value)}
          size="small"
          sx={{ minWidth: 200 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 16, color: tokens.ink4 }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Box
                  component="kbd"
                  sx={{
                    fontSize: 10,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: tokens.ink4,
                    border: `1px solid ${tokens.line}`,
                    borderRadius: 'var(--r-sm)',
                    px: '4px',
                    py: '1px',
                    lineHeight: 1.4,
                  }}
                >
                  ⌘K
                </Box>
              </InputAdornment>
            ),
          }}
        />

        <FormControl size="small" sx={{ minWidth: 200 }} disabled={divisionsLoading}>
          <InputLabel>Division</InputLabel>
          <Select
            value={divisionFilter}
            label="Division"
            onChange={(e) => setDivisionFilter(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.line },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: tokens.ink4 },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: tokens.ink4 },
            }}
          >
            <MenuItem value="">All divisions</MenuItem>
            {divisions?.map((div) => (
              <MenuItem key={div.id} value={div.id}>
                {div.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.line },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: tokens.ink4 },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: tokens.ink4 },
            }}
          >
            <MenuItem value="">All statuses</MenuItem>
            <MenuItem value="NORMAL">Normal</MenuItem>
            <MenuItem value="WARNING">Warning</MenuItem>
            <MenuItem value="OVERLOADED">Overloaded</MenuItem>
          </Select>
        </FormControl>
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
                    {engineer.loadRatio != null ? <CapBar pct={engineer.loadRatio} /> : '—'}
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
      <CreateEngineerDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Box>
  )
}
