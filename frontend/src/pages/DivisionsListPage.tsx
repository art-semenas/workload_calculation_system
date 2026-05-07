import { useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { PageHead } from '../components/common/PageHead'
import { KPIRow, type KPIItem } from '../components/common/KPIRow'
import { SectionBlock } from '../components/common/SectionBlock'
import { CapBar } from '../components/common/CapBar'
import { CreateDivisionDialog } from '../components/dialogs/CreateDivisionDialog'
import { useDivisions } from '../hooks/useDivisions'
import { tokens } from '../theme'

export default function DivisionsListPage() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { data, isLoading } = useDivisions()

  // Display aggregation of server-computed values — not a domain calculation (TOR AD-07 permits this)
  const divisionCount = data?.length ?? 0
  const totalObjects = data?.reduce((sum, d) => sum + (d.objectCount ?? 0), 0) ?? 0
  const totalEngineers = data?.reduce((sum, d) => sum + (d.engineerCount ?? 0), 0) ?? 0

  // Compute average utilisation (warn if > 100%)
  const validUtilisations = (data ?? []).filter(
    (d) => d.utilisation !== null && d.utilisation !== undefined
  )
  const avgUtilisation =
    validUtilisations.length > 0
      ? validUtilisations.reduce((sum, d) => sum + (d.utilisation ?? 0), 0) /
        validUtilisations.length
      : 0

  const avgUtilisationPercent = Math.round(avgUtilisation * 100)
  const avgUtilisationTone = avgUtilisation > 1.0 ? 'danger' : avgUtilisation > 0.9 ? 'warn' : 'ok'

  const kpiItems: KPIItem[] = [
    { label: 'Divisions', value: divisionCount },
    { label: 'Total objects', value: totalObjects },
    { label: 'Total engineers', value: totalEngineers },
    {
      label: 'Avg utilisation',
      value: `${avgUtilisationPercent}%`,
      tone: avgUtilisationTone,
    },
  ]

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {/* Page Head */}
      <PageHead
        crumbs={[{ label: 'Workload', to: '/' }, { label: 'Divisions' }]}
        title="Divisions"
        subtitle={`${divisionCount} regional divisions · ${totalObjects} objects · ${totalEngineers} engineers`}
        actions={
          <Button variant="contained" onClick={() => setOpen(true)}>
            Create division
          </Button>
        }
      />

      {/* KPI Row */}
      {data && data.length > 0 && <KPIRow items={kpiItems} />}

      {/* Table Section */}
      {data && data.length > 0 ? (
        <SectionBlock label="All divisions" meta={`${divisionCount} divisions`}>
          <Paper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '8%', fontWeight: 600 }}>Code</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Division name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Head engineer</TableCell>
                  <TableCell sx={{ width: '8%', fontWeight: 600, textAlign: 'right' }}>
                    Objects
                  </TableCell>
                  <TableCell sx={{ width: '8%', fontWeight: 600, textAlign: 'right' }}>
                    Engineers
                  </TableCell>
                  <TableCell sx={{ width: '10%', fontWeight: 600 }}>FTE req.</TableCell>
                  <TableCell sx={{ width: '8%', fontWeight: 600 }}>Gap</TableCell>
                  <TableCell sx={{ width: '15%', fontWeight: 600 }}>Utilisation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((division) => (
                  <TableRow
                    key={division.id}
                    hover
                    onClick={() => void navigate(`/divisions/${division.id}`)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: tokens.bgElev },
                    }}
                  >
                    {/* Code */}
                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {division.name.substring(0, 3).toUpperCase()}
                    </TableCell>

                    {/* Division name */}
                    <TableCell>{division.name}</TableCell>

                    {/* Head engineer (placeholder) */}
                    <TableCell>—</TableCell>

                    {/* Objects */}
                    <TableCell sx={{ textAlign: 'right' }}>{division.objectCount ?? '—'}</TableCell>

                    {/* Engineers */}
                    <TableCell sx={{ textAlign: 'right' }}>
                      {division.engineerCount ?? '—'}
                    </TableCell>

                    {/* FTE required */}
                    <TableCell>
                      {division.requiredFte !== null && division.requiredFte !== undefined
                        ? division.requiredFte.toFixed(2)
                        : '—'}
                    </TableCell>

                    {/* Coverage gap */}
                    <TableCell
                      sx={{
                        color:
                          division.coverageGap && division.coverageGap > 0
                            ? tokens.danger
                            : 'inherit',
                      }}
                    >
                      {division.coverageGap && division.coverageGap > 0
                        ? division.coverageGap
                        : '—'}
                    </TableCell>

                    {/* Utilisation bar */}
                    <TableCell>
                      {division.utilisation !== null && division.utilisation !== undefined ? (
                        <CapBar pct={division.utilisation} />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </SectionBlock>
      ) : (
        <Typography color="text.secondary">No divisions</Typography>
      )}

      {/* Create Division Dialog */}
      <CreateDivisionDialog open={open} onClose={() => setOpen(false)} />
    </Box>
  )
}
