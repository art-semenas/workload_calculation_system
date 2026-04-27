import {
  Box,
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
import { useDivisionsAggregation, useCoverageGaps } from '../hooks/useAggregations'
import { useSvod } from '../hooks/useSvod'
import { KpiTile } from '../components/common/KpiTile'
import { Num } from '../components/common/Num'
import { StatusChip } from '../components/common/StatusChip'
import { Sparkline } from '../components/common/Sparkline'

export default function DashboardPage() {
  const navigate = useNavigate()

  const { data: divisions, isLoading: divisionsLoading } = useDivisionsAggregation()
  const { data: svodPageFull } = useSvod(0, 100)
  const { data: svodPage, isLoading: svodLoading } = useSvod(0, 5)
  const { data: gaps } = useCoverageGaps()

  const topObjects = svodPage?.content ?? []
  const allObjects = svodPageFull?.content ?? []

  // Calculate KPI values
  const requiredFteTotal = allObjects.reduce((sum, obj) => sum + obj.itogoChisloWithTravel, 0)
  const objectsCount = svodPageFull?.totalElements ?? 0
  const gapsCount = gaps?.length ?? 0
  const overloadedEngineersStub = 0 // Stubbed for Phase B2

  // Placeholder sparkline data (flat line until time-series exists)
  const placeholderTrend = Array(12).fill(0.5)

  return (
    <Box sx={{ p: 3 }}>
      {/* KPI Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          mb: '32px',
        }}
      >
        <KpiTile label="Required FTE" value={requiredFteTotal} unit="FTE" />
        <KpiTile label="Objects under maintenance" value={objectsCount} />
        <KpiTile label="Coverage gaps" value={gapsCount} />
        <KpiTile label="Engineers overloaded" value={overloadedEngineersStub} />
      </Box>

      {/* Main 2-column grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr',
          gap: '24px',
        }}
      >
        {/* Left column: FTE by division table */}
        <Paper sx={{ p: '20px' }}>
          <Typography variant="h6" sx={{ mb: '16px', fontWeight: 600 }}>
            FTE by division
          </Typography>
          {divisionsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Table sx={{ tableLayout: 'auto' }}>
              <TableHead>
                <TableRow sx={{ borderBottom: '1px solid var(--line)' }}>
                  <TableCell sx={{ fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                    Division
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                    FTE
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                    Objects
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                    Gaps
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                    Trend
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(divisions ?? []).map((div) => (
                  <TableRow
                    key={div.divisionId}
                    hover
                    onClick={() => {
                      navigate(`/divisions/${div.divisionId}`)
                    }}
                    sx={{
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--line)',
                      height: '44px',
                    }}
                  >
                    <TableCell sx={{ fontSize: '14px' }}>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          backgroundColor: 'var(--bg-sunken)',
                          px: '8px',
                          py: '4px',
                          borderRadius: '4px',
                          fontWeight: 500,
                        }}
                      >
                        {/* Extract number from division name (e.g., "Division 1" -> "1") */}
                        {div.divisionName.replace(/\D/g, '') || '—'}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: '14px', fontFamily: '"JetBrains Mono", monospace' }}>
                      <Num value={div.requiredFte} digits={2} />
                    </TableCell>
                    <TableCell sx={{ fontSize: '14px' }}>{div.objectCount}</TableCell>
                    <TableCell sx={{ fontSize: '14px' }}>
                      {div.coverageGapCount > 0 ? (
                        <StatusChip kind="danger" label={`${div.coverageGapCount}`} size="small" />
                      ) : (
                        <StatusChip kind="ok" label="0" size="small" />
                      )}
                    </TableCell>
                    <TableCell sx={{ width: '80px' }}>
                      <Sparkline
                        data={placeholderTrend}
                        width="80"
                        height={20}
                        color="var(--accent)"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        {/* Right column */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top 5 objects card */}
          <Paper sx={{ p: '20px' }}>
            <Typography variant="h6" sx={{ mb: '16px', fontWeight: 600 }}>
              Top 5 objects
            </Typography>
            {svodLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress />
              </Box>
            ) : topObjects.length === 0 ? (
              <Typography sx={{ color: 'var(--ink3)' }}>No objects</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {topObjects.map((obj) => (
                  <Box
                    key={obj.objectId}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: '12px',
                      px: '12px',
                      borderBottom: '1px solid var(--line)',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'var(--bg-sunken)',
                      },
                    }}
                    onClick={() => navigate(`/objects/${obj.objectId}`)}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        sx={{
                          fontSize: '14px',
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {obj.objectName}
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: 'var(--ink3)', mt: '4px' }}>
                        {obj.divisionName}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '14px',
                        fontWeight: 500,
                        ml: '16px',
                        minWidth: '60px',
                        textAlign: 'right',
                      }}
                    >
                      <Num value={obj.itogoChisloWithTravel} digits={4} />
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>

          {/* Overloaded engineers card (stub) */}
          <Paper sx={{ p: '20px' }}>
            <Typography variant="h6" sx={{ mb: '16px', fontWeight: 600 }}>
              Overloaded engineers
            </Typography>
            <Typography sx={{ color: 'var(--ink3)', fontSize: '14px' }}>
              No overloaded engineers
            </Typography>
          </Paper>
        </Box>
      </Box>
    </Box>
  )
}
