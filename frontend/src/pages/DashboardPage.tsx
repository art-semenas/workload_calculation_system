import { useState } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { PageHead } from '../components/common/PageHead'
import { KPIRow } from '../components/common/KPIRow'
import { SectionBlock } from '../components/common/SectionBlock'
import { QuietDrawer, DrawerSection } from '../components/common/QuietDrawer'
import { ErrorPage } from '../components/common/ErrorPage'
import { useDivisionsAggregation, useCoverageGaps } from '../hooks/useAggregations'
import { extractApiError, isServerError } from '../utils/errorMessages'
import { useSvod } from '../hooks/useSvod'
import { tokens } from '../theme'
import type { AggregationDivision } from '../types/m02'

const TOP_OBJECTS_LIMIT = 5

// PoC (S-05): period selector is decorative — no period_id on records yet. Wired in MVP M-05.
const PERIODS = ['FY25', 'FY26', 'Q-by-Q'] as const
type Period = (typeof PERIODS)[number]

function getDivisionTone(div: AggregationDivision): 'ok' | 'warn' | 'danger' {
  if (div.engineersOverloaded > 0) return 'danger'
  if (div.coverageGapCount > 0) return 'warn'
  return 'ok'
}

const TONE_STYLES = {
  ok: { bg: tokens.okSoft, color: tokens.ok, label: 'OK' },
  warn: { bg: tokens.warnSoft, color: tokens.warn, label: 'Gap' },
  danger: { bg: tokens.dangerSoft, color: tokens.danger, label: 'Overloaded' },
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [period, setPeriod] = useState<Period>('FY25')

  const {
    data: divisions,
    isLoading: divisionsLoading,
    isError: divisionsIsError,
    error: divisionsError,
    refetch: refetchDivisions,
  } = useDivisionsAggregation()
  const { data: svodPage, isLoading: svodLoading } = useSvod(0, 10)
  const { data: gaps, isLoading: gapsLoading } = useCoverageGaps()

  const topObjects = svodPage?.content ?? []
  const divsList = divisions ?? []

  const totalFte = divsList.reduce((sum, d) => sum + d.requiredFte, 0)
  const totalObjects = divsList.reduce((sum, d) => sum + d.objectCount, 0)
  const totalGaps = divsList.reduce((sum, d) => sum + d.coverageGapCount, 0)
  const totalOverloaded = divsList.reduce((sum, d) => sum + d.engineersOverloaded, 0)

  if (divisionsIsError && isServerError(divisionsError)) {
    return (
      <ErrorPage
        message={extractApiError(divisionsError)?.message}
        onRetry={() => void refetchDivisions()}
      />
    )
  }

  return (
    <Box>
      <PageHead
        crumbs={[{ label: 'Workload', to: '/' }, { label: 'Overview' }]}
        title="Maintenance workload"
        subtitle="Consolidated FTE across all divisions and objects"
        actions={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                display: 'flex',
                border: `1px solid ${tokens.line}`,
                borderRadius: 'var(--r-pill)',
                overflow: 'hidden',
              }}
            >
              {PERIODS.map((p) => (
                <Box
                  key={p}
                  component="button"
                  onClick={() => setPeriod(p)}
                  sx={{
                    fontSize: 12,
                    fontWeight: period === p ? 500 : 400,
                    color: period === p ? tokens.ink : tokens.ink3,
                    background: period === p ? tokens.bgSunken : 'transparent',
                    border: 'none',
                    borderLeft: p !== PERIODS[0] ? `1px solid ${tokens.line}` : 'none',
                    cursor: 'pointer',
                    px: '10px',
                    py: '5px',
                    lineHeight: 1.4,
                  }}
                >
                  {p}
                </Box>
              ))}
            </Box>
            <Button variant="outlined" size="small" onClick={() => setDrawerOpen(true)}>
              Details ›
            </Button>
            {/* PoC (S-02): recalculate triggers manual sync. Background worker added in MVP M-06. */}
            <Button variant="contained" size="small">
              Recalculate
            </Button>
          </Box>
        }
      />

      {!divisionsLoading && (
        <KPIRow
          items={[
            { label: 'Required FTE', value: totalFte.toFixed(2) },
            { label: 'Objects', value: totalObjects },
            {
              label: 'Coverage gaps',
              value: totalGaps,
              tone: totalGaps > 0 ? 'warn' : undefined,
            },
            {
              label: 'Overloaded engineers',
              value: totalOverloaded,
              tone: totalOverloaded > 0 ? 'danger' : undefined,
            },
          ]}
        />
      )}

      <SectionBlock
        label="FTE by division"
        meta={`${divsList.length} divisions · sorted by required FTE`}
      >
        {divisionsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table data-testid="fte-division-table">
            <TableHead>
              <TableRow>
                <TableCell>Division</TableCell>
                <TableCell>Objects</TableCell>
                <TableCell>Required FTE</TableCell>
                <TableCell>Coverage gap</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {divsList.map((div) => {
                const tone = getDivisionTone(div)
                const ts = TONE_STYLES[tone]
                return (
                  <TableRow
                    key={div.divisionId}
                    hover
                    onClick={() => void navigate(`/divisions/${div.divisionId}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{div.divisionName}</TableCell>
                    <TableCell>{div.objectCount}</TableCell>
                    <TableCell sx={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>
                      {div.requiredFte.toFixed(4)}
                    </TableCell>
                    <TableCell>{div.coverageGapCount}</TableCell>
                    <TableCell>
                      <Chip
                        label={ts.label}
                        size="small"
                        sx={{ backgroundColor: ts.bg, color: ts.color }}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </SectionBlock>

      <SectionBlock
        label="Top objects by workload"
        meta={`Sorted by ИТОГО Числ · top ${TOP_OBJECTS_LIMIT}`}
      >
        {svodLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Object</TableCell>
                <TableCell>Division</TableCell>
                <TableCell>FTE</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topObjects.slice(0, TOP_OBJECTS_LIMIT).map((row) => (
                <TableRow
                  key={row.objectId}
                  hover
                  onClick={() => void navigate(`/objects/${row.objectId}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{row.objectName}</TableCell>
                  <TableCell sx={{ color: tokens.ink3 }}>{row.divisionName}</TableCell>
                  <TableCell
                    sx={{
                      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                      fontWeight: 600,
                    }}
                  >
                    {row.itogoChisloWithTravel.toFixed(6)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionBlock>

      <QuietDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Details">
        <DrawerSection label="Uncovered objects">
          {gapsLoading ? (
            <CircularProgress size={20} />
          ) : (gaps ?? []).length === 0 ? (
            <Typography sx={{ fontSize: 13, color: tokens.ink3 }}>No uncovered objects</Typography>
          ) : (
            <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
              {(gaps ?? []).map((gap) => (
                <Box
                  key={gap.objectId}
                  component="li"
                  sx={{
                    py: '8px',
                    borderBottom: `1px solid ${tokens.line}`,
                  }}
                >
                  <Box sx={{ fontSize: 13, color: tokens.ink2 }}>{gap.objectName}</Box>
                  <Box sx={{ fontSize: 11, color: tokens.ink3 }}>
                    {gap.divisionName} · {gap.branchName}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DrawerSection>
      </QuietDrawer>
    </Box>
  )
}
