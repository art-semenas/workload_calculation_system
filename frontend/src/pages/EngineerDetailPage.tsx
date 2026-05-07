import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useEngineer,
  useEngineerSummary,
  useEngineerObjects,
  useUpdateEngineer,
  useAssignObjectToEngineer,
  useRemoveObjectFromEngineer,
} from '../hooks/useEngineers'
import { useDivisions } from '../hooks/useDivisions'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { FormTextField } from '../components/common/FormTextField'
import { PageHead } from '../components/common/PageHead'
import { SectionBlock } from '../components/common/SectionBlock'
import { QuietDialog } from '../components/dialogs/QuietDialog'
import EngineerAssignDialog from '../components/engineers/EngineerAssignDialog'
import {
  EngineerUpdateSchema,
  type EngineerUpdateRequest,
  type EngineerStatus,
} from '../types/engineer'
import { tokens } from '../theme'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const STATUS_CHIP: Record<EngineerStatus, { bg: string; color: string; label: string }> = {
  NORMAL: { bg: tokens.okSoft, color: tokens.ok, label: 'Within capacity' },
  WARNING: { bg: tokens.warnSoft, color: tokens.warn, label: 'Near capacity' },
  OVERLOADED: { bg: tokens.dangerSoft, color: tokens.danger, label: 'Overloaded' },
}

const SYSTEM_ROWS = [
  { key: 'osLoad' as const, label: 'Security' },
  { key: 'psLoad' as const, label: 'Fire' },
  { key: 'videoLoad' as const, label: 'Video' },
  { key: 'recordsLoad' as const, label: 'Records' },
  { key: 'repairLoad' as const, label: 'Repairs' },
]

// ── Page ─────────────────────────────────────────────────────────────────────

export default function EngineerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: engineer, isLoading: engineerLoading } = useEngineer(id ?? '')
  const { data: summary, isLoading: summaryLoading } = useEngineerSummary(id ?? '')
  const { data: objects = [], isLoading: objectsLoading } = useEngineerObjects(id ?? '')
  const { data: divisions = [] } = useDivisions()

  const updateMutation = useUpdateEngineer(id ?? '')
  const assignMutation = useAssignObjectToEngineer(id ?? '')
  const removeMutation = useRemoveObjectFromEngineer(id ?? '')

  const [editOpen, setEditOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [removeObjectId, setRemoveObjectId] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const { control, handleSubmit } = useForm<EngineerUpdateRequest>({
    resolver: zodResolver(EngineerUpdateSchema),
    values: engineer
      ? {
          name: engineer.name,
          capacityFte: engineer.capacityFte,
          homeDivisionId: engineer.homeDivisionId ?? '',
        }
      : undefined,
  })

  if (!id) return <Typography>Engineer not found</Typography>

  if (engineerLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!engineer) return <Typography>Engineer not found</Typography>

  const handleEditClose = () => {
    setEditOpen(false)
    setEditError(null)
  }

  const onEditSubmit = async (data: EngineerUpdateRequest) => {
    try {
      setEditError(null)
      await updateMutation.mutateAsync(data)
      setEditOpen(false)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update engineer')
    }
  }

  const handleRemoveOpen = (objectId: string) => {
    setRemoveObjectId(objectId)
    setConfirmOpen(true)
  }

  const handleRemoveConfirm = async () => {
    if (!removeObjectId) return
    try {
      setRemoveError(null)
      await removeMutation.mutateAsync(removeObjectId)
      setConfirmOpen(false)
      setRemoveObjectId(null)
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : 'Failed to remove assignment')
    }
  }

  const handleAssignSubmit = async (objectId: string) => {
    try {
      setAssignError(null)
      await assignMutation.mutateAsync(objectId)
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Failed to assign object')
    }
  }

  const status = summary?.status ?? engineer.status ?? 'NORMAL'
  const chipStyle = STATUS_CHIP[status]

  const divisionsCount = new Set(objects.filter((o) => o.divisionName).map((o) => o.divisionName))
    .size

  const sortedObjects = [...objects].sort((a, b) => b.engineerShare - a.engineerShare)

  const removeObjectName = objects.find((o) => o.objectId === removeObjectId)?.objectName

  return (
    <Box>
      <PageHead
        crumbs={[
          { label: 'Workload', to: '/' },
          { label: 'Engineers', to: '/engineers' },
          { label: engineer.homeDivisionName ?? '' },
        ]}
        title={engineer.name}
        subtitle={`${engineer.email} · ${engineer.homeDivisionName ?? '—'}`}
        actions={
          <Button variant="outlined" size="small" onClick={() => setEditOpen(true)}>
            Edit engineer
          </Button>
        }
      />

      {/* Initials + status row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: -2, mb: 3.5 }}>
        {/* Avatar */}
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 'var(--r-sm)',
            backgroundColor: tokens.ink,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1 }}>
            {getInitials(engineer.name)}
          </Typography>
        </Box>

        {/* Status chip */}
        {summary && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: 12,
              fontWeight: 500,
              px: '8px',
              py: '3px',
              borderRadius: 'var(--r-pill)',
              backgroundColor: chipStyle.bg,
              color: chipStyle.color,
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: chipStyle.color,
                flexShrink: 0,
              }}
            />
            {chipStyle.label}
          </Box>
        )}
      </Box>

      {/* Stats strip */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          borderTop: `1px solid ${tokens.line}`,
          borderBottom: `1px solid ${tokens.line}`,
          mb: 4.5,
        }}
      >
        {[
          {
            label: 'FTE load',
            value: summaryLoading ? '…' : `${(summary?.totalLoad ?? 0).toFixed(3)} FTE`,
            alert: status === 'OVERLOADED',
          },
          {
            label: 'Capacity',
            value: summaryLoading ? '…' : `${(summary?.capacityFte ?? 0).toFixed(1)} FTE`,
          },
          {
            label: 'Utilisation',
            value: summaryLoading ? '…' : `${Math.round((summary?.loadRatio ?? 0) * 100)}%`,
            alert: status === 'OVERLOADED',
          },
          {
            label: 'Objects',
            value: summaryLoading ? '…' : `${summary?.objectCount ?? 0}`,
          },
          {
            label: 'Divisions',
            value: objectsLoading ? '…' : `${divisionsCount}`,
          },
        ].map((stat, i) => (
          <Box
            key={stat.label}
            sx={{
              padding: '20px 24px',
              borderLeft: i === 0 ? 'none' : `1px solid ${tokens.line}`,
            }}
          >
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: tokens.ink3,
                mb: 1.25,
              }}
            >
              {stat.label}
            </Typography>
            <Typography
              sx={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: 24,
                fontWeight: 500,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                color: stat.alert ? tokens.danger : tokens.ink,
              }}
            >
              {stat.value}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* FTE by system */}
      <SectionBlock label="FTE by system" meta="monthly average">
        {summaryLoading ? (
          <CircularProgress size={20} />
        ) : !summary ? (
          <Typography sx={{ fontSize: 13, color: tokens.ink3 }}>No load data</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
            {SYSTEM_ROWS.map(({ key, label }) => {
              const load = summary[key]
              const pct = summary.totalLoad > 0 ? (load / summary.totalLoad) * 100 : 0
              return (
                <Box key={label}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: '6px',
                    }}
                  >
                    <Typography sx={{ fontSize: 13, color: tokens.ink2 }}>{label}</Typography>
                    <Typography
                      sx={{
                        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                        fontSize: 12,
                        color: tokens.ink3,
                      }}
                    >
                      {load.toFixed(3)} · {Math.round(pct)}%
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      height: 4,
                      backgroundColor: tokens.bgSunken,
                      borderRadius: 'var(--r-sm)',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        width: `${pct}%`,
                        height: '100%',
                        backgroundColor: tokens.ink,
                        borderRadius: 'var(--r-sm)',
                      }}
                    />
                  </Box>
                </Box>
              )
            })}
          </Box>
        )}
      </SectionBlock>

      {/* Assigned objects */}
      <SectionBlock
        label="Assigned objects"
        meta={`${objects.length} objects · sorted by FTE share`}
        actions={
          <Button variant="outlined" size="small" onClick={() => setAssignOpen(true)}>
            Assign object
          </Button>
        }
      >
        {assignError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAssignError(null)}>
            {assignError}
          </Alert>
        )}
        {removeError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setRemoveError(null)}>
            {removeError}
          </Alert>
        )}

        {objectsLoading ? (
          <CircularProgress size={20} />
        ) : objects.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: tokens.ink3 }}>No objects assigned</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Object</TableCell>
                <TableCell>FTE share</TableCell>
                <TableCell>% of total</TableCell>
                <TableCell sx={{ width: 32, p: 0 }} />
                <TableCell sx={{ width: 80 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedObjects.map((obj) => {
                // Display-only percentage for progress bar — normalises server-provided values
                const pctOfTotal =
                  summary && summary.totalLoad > 0
                    ? (obj.engineerShare / summary.totalLoad) * 100
                    : 0
                return (
                  <TableRow
                    key={obj.objectId}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => void navigate(`/objects/${obj.objectId}`)}
                  >
                    <TableCell>{obj.objectName}</TableCell>
                    <TableCell
                      sx={{
                        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {obj.engineerShare.toFixed(4)}
                    </TableCell>
                    <TableCell sx={{ color: tokens.ink3, fontSize: 13 }}>
                      {Math.round(pctOfTotal)}%
                    </TableCell>
                    <TableCell sx={{ width: 32, p: 0, pr: 1, textAlign: 'right' }}>
                      <ChevronRightIcon
                        sx={{ fontSize: 16, color: tokens.ink4, display: 'block' }}
                      />
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleRemoveOpen(obj.objectId)}
                        disabled={removeMutation.isPending}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </SectionBlock>

      {/* Edit engineer dialog */}
      <QuietDialog open={editOpen} onClose={handleEditClose} paperWidth={480}>
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
            Update
          </Typography>
          <Typography sx={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em' }}>
            Edit engineer
          </Typography>
          <IconButton
            onClick={handleEditClose}
            size="small"
            sx={{ position: 'absolute', right: 8, top: 8, color: tokens.ink3 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <Box
          component="form"
          onSubmit={(e) => {
            void handleSubmit(onEditSubmit)(e)
          }}
        >
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {editError && <Alert severity="error">{editError}</Alert>}
            <FormTextField name="name" control={control} label="Name" fullWidth autoFocus />
            <FormTextField
              name="capacityFte"
              control={control}
              label="Capacity FTE"
              type="number"
              inputProps={{ step: 0.1 }}
              fullWidth
            />
            <Controller
              name="homeDivisionId"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Division</InputLabel>
                  <Select {...field} label="Division">
                    <MenuItem value="">None</MenuItem>
                    {divisions.map((div) => (
                      <MenuItem key={div.id} value={div.id}>
                        {div.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleEditClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={updateMutation.isPending}>
              Save
            </Button>
          </DialogActions>
        </Box>
      </QuietDialog>

      {/* Assign object dialog */}
      <EngineerAssignDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        onAssign={handleAssignSubmit}
        isAssigning={assignMutation.isPending}
      />

      {/* Remove confirm */}
      <ConfirmDialog
        open={confirmOpen}
        title="Remove assignment"
        message={`Remove engineer assignment from «${removeObjectName ?? ''}»?`}
        onConfirm={() => void handleRemoveConfirm()}
        onCancel={() => {
          setConfirmOpen(false)
          setRemoveObjectId(null)
        }}
        confirmLabel="Remove"
      />
    </Box>
  )
}
