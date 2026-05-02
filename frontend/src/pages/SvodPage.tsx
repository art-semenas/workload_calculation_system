import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputAdornment,
  MenuItem,
  Select,
  type SelectChangeEvent,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { PageHead } from '../components/common/PageHead'
import { useSvod } from '../hooks/useSvod'
import { useUiStore } from '../stores/uiStore'
import { exportSvodXlsx } from '../api/svod'
import { getDivisions } from '../api/divisions'
import { tokens } from '../theme'
import type { SvodRow } from '../types/m02'

type NumericFormatterParams = { value: number }

function fmt(value: number, places: number): string {
  if (value === 0) return ''
  return value.toFixed(places)
}

const colObjectName = (wide = false): GridColDef<SvodRow> => ({
  field: 'objectName',
  headerName: 'Object',
  align: 'left',
  headerAlign: 'left',
  width: wide ? 280 : 340,
  flex: wide ? undefined : 1,
  renderCell: ({ row }: { row: SvodRow }) => (
    <Link to={`/objects/${row.objectId}`} style={{ color: tokens.ink2, textDecoration: 'none' }}>
      {row.objectName}
    </Link>
  ),
})

const colEngCount = (): GridColDef<SvodRow> => ({
  field: 'engineers',
  headerName: 'Eng',
  align: 'right',
  headerAlign: 'right',
  width: 70,
  renderCell: ({ value }: { value?: string[] }) => {
    const n = Array.isArray(value) ? value.length : 0
    return <Box sx={{ color: n === 0 ? tokens.ink4 : tokens.ink3 }}>{n === 0 ? '—' : n}</Box>
  },
})

const colEngNames = (): GridColDef<SvodRow> => ({
  field: 'engineers',
  headerName: 'Engineers',
  align: 'left',
  headerAlign: 'left',
  width: 200,
  renderCell: ({ value }: { value?: string[] }) => {
    const names = Array.isArray(value) ? value : []
    if (names.length === 0) return <Box sx={{ color: tokens.ink4 }}>—</Box>
    const text = names.join(', ')
    return (
      <Tooltip title={text}>
        <Box
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: tokens.ink3,
          }}
        >
          {text}
        </Box>
      </Tooltip>
    )
  },
})

function buildCompactColumns(precision: 2 | 6): GridColDef<SvodRow>[] {
  return [
    colObjectName(false),
    colEngCount(),
    {
      field: 'itogoChisloNoTravel',
      headerName: 'FTE no travel',
      align: 'right',
      headerAlign: 'right',
      width: 130,
      valueFormatter: ({ value }: NumericFormatterParams) => fmt(value, precision),
    },
    {
      field: 'itogoChisloWithTravel',
      headerName: 'ИТОГО Числ',
      align: 'right',
      headerAlign: 'right',
      width: 130,
      valueFormatter: ({ value }: NumericFormatterParams) => fmt(value, precision),
      cellClassName: 'itogo-cell',
    },
  ]
}

function buildFullColumns(precision: 2 | 6): GridColDef<SvodRow>[] {
  return [
    colObjectName(true),
    colEngNames(),
    {
      field: 'pzvMinutes',
      headerName: 'PZV',
      align: 'right',
      headerAlign: 'right',
      width: 80,
      valueFormatter: ({ value }: NumericFormatterParams) => fmt(value, precision),
    },
    {
      field: 'roundTripMin',
      headerName: 'Travel',
      align: 'right',
      headerAlign: 'right',
      width: 80,
      valueFormatter: ({ value }: NumericFormatterParams) => fmt(value, precision),
    },
    {
      field: 'psMonthlyAvg',
      headerName: 'ПС',
      align: 'right',
      headerAlign: 'right',
      width: 90,
      valueFormatter: ({ value }: NumericFormatterParams) => fmt(value, precision),
    },
    {
      field: 'videoMonthlyAvg',
      headerName: 'Видео',
      align: 'right',
      headerAlign: 'right',
      width: 90,
      valueFormatter: ({ value }: NumericFormatterParams) => fmt(value, precision),
    },
    {
      field: 'osMonthlyAvg',
      headerName: 'ОС',
      align: 'right',
      headerAlign: 'right',
      width: 90,
      valueFormatter: ({ value }: NumericFormatterParams) => fmt(value, precision),
    },
    {
      field: 'recordsMonthly',
      headerName: 'Records',
      align: 'right',
      headerAlign: 'right',
      width: 90,
      valueFormatter: ({ value }: NumericFormatterParams) => fmt(value, precision),
    },
    {
      field: 'repairNoTravelMonthly',
      headerName: 'Repair',
      align: 'right',
      headerAlign: 'right',
      width: 90,
      valueFormatter: ({ value }: NumericFormatterParams) => fmt(value, precision),
    },
    {
      field: 'r1PerVisitTotal',
      headerName: 'R1',
      align: 'right',
      headerAlign: 'right',
      width: 90,
      valueFormatter: ({ value }: NumericFormatterParams) => fmt(value, precision),
    },
    {
      field: 'r2PerVisitTotal',
      headerName: 'R2',
      align: 'right',
      headerAlign: 'right',
      width: 90,
      valueFormatter: ({ value }: NumericFormatterParams) => fmt(value, precision),
    },
    {
      field: 'itogoChisloNoTravel',
      headerName: 'FTE no tr',
      align: 'right',
      headerAlign: 'right',
      width: 110,
      valueFormatter: ({ value }: NumericFormatterParams) => fmt(value, precision),
    },
    {
      field: 'itogoChisloWithTravel',
      headerName: 'ИТОГО Числ',
      align: 'right',
      headerAlign: 'right',
      width: 130,
      valueFormatter: ({ value }: NumericFormatterParams) => fmt(value, precision),
      cellClassName: 'itogo-cell',
    },
  ]
}

const quietGridSx = {
  border: 'none',
  '& .MuiDataGrid-columnHeaders': {
    borderBottom: `1px solid ${tokens.line}`,
    backgroundColor: 'transparent',
    minHeight: '40px !important',
    maxHeight: '40px !important',
  },
  '& .MuiDataGrid-columnHeaderTitle': {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    color: tokens.ink3,
  },
  '& .MuiDataGrid-columnSeparator': {
    display: 'none',
  },
  '& .MuiDataGrid-row': {
    minHeight: '52px !important',
    maxHeight: '52px !important',
  },
  '& .MuiDataGrid-cell': {
    borderBottom: `1px solid ${tokens.line}`,
    fontSize: 13,
    color: tokens.ink2,
    display: 'flex',
    alignItems: 'center',
  },
  '& .MuiDataGrid-row:hover': {
    backgroundColor: 'rgba(0,0,0,0.012)',
  },
  '& .itogo-cell': {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontWeight: 600,
    color: tokens.ink,
  },
}

const PAGE_SIZE = 10

export default function SvodPage() {
  const [page, setPage] = useState(0)
  const [divisionId, setDivisionId] = useState('')
  const [search, setSearch] = useState('')
  const [exportError, setExportError] = useState<string | null>(null)

  const [showBreakdown, setShowBreakdown] = useState(false)

  const { svodPrecision, setSvodPrecision } = useUiStore()

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions'],
    queryFn: getDivisions,
  })

  const { data, isLoading, isError } = useSvod(page, PAGE_SIZE, divisionId || undefined)

  const columns = useMemo(
    () => (showBreakdown ? buildFullColumns(svodPrecision) : buildCompactColumns(svodPrecision)),
    [showBreakdown, svodPrecision]
  )

  const filteredRows = useMemo(() => {
    const rows = data?.content ?? []
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter(
      (r) =>
        r.objectName.toLowerCase().includes(q) ||
        (r.address ?? '').toLowerCase().includes(q) ||
        r.divisionName.toLowerCase().includes(q)
    )
  }, [data?.content, search])

  const totalElements = data?.totalElements ?? 0
  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE))
  const rangeStart = totalElements === 0 ? 0 : page * PAGE_SIZE + 1
  const rangeEnd = Math.min((page + 1) * PAGE_SIZE, totalElements)

  const pageSum = filteredRows.reduce((s, r) => s + r.itogoChisloWithTravel, 0)
  const pageAvg = filteredRows.length > 0 ? pageSum / filteredRows.length : 0

  const handleExport = () => {
    setExportError(null)
    exportSvodXlsx()
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'svod.xlsx'
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch(() => {
        setExportError('Export failed. Please try again.')
      })
  }

  const subtitle = `Consolidated workload across all objects${totalElements > 0 ? ` · ${totalElements.toLocaleString()} rows` : ''}`

  return (
    <Box>
      <PageHead
        crumbs={[{ label: 'Workload', to: '/' }, { label: 'СВОД' }]}
        title="СВОД"
        subtitle={subtitle}
        actions={
          <Button variant="outlined" size="small" onClick={handleExport}>
            Export XLSX
          </Button>
        }
      />

      {/* Filter row: search + division + precision */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search objects, addresses…"
          aria-label="Search summary"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(0)
          }}
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
                    color: tokens.ink4,
                    border: `1px solid ${tokens.line}`,
                    borderRadius: '3px',
                    px: '4px',
                    py: '1px',
                    fontFamily: 'inherit',
                  }}
                >
                  ⌘K
                </Box>
              </InputAdornment>
            ),
          }}
          sx={{ width: 260 }}
        />

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            value={divisionId}
            onChange={(e: SelectChangeEvent) => {
              setDivisionId(e.target.value)
              setPage(0)
            }}
            displayEmpty
            sx={{
              fontSize: 13,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.lineStrong },
            }}
          >
            <MenuItem value="">All divisions</MenuItem>
            {divisions.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          size="small"
          onClick={() => setShowBreakdown((v) => !v)}
          sx={{ whiteSpace: 'nowrap' }}
        >
          {showBreakdown ? 'Hide breakdown' : 'Show breakdown'}
        </Button>

        <Box sx={{ flex: 1 }} />

        <Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
          Precision:{' '}
          <Box
            component="span"
            onClick={() => setSvodPrecision(svodPrecision === 2 ? 6 : 2)}
            sx={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              color: tokens.ink2,
              textDecoration: 'underline',
              textDecorationColor: tokens.lineStrong,
              cursor: 'pointer',
              '&:hover': { color: tokens.ink },
            }}
          >
            {svodPrecision === 2 ? '2 decimals · show full' : 'full · show 2'}
          </Box>
        </Typography>
      </Box>

      {exportError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setExportError(null)}>
          {exportError}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : isError ? (
        <Alert severity="error">Failed to load data</Alert>
      ) : (
        <Box sx={{ width: '100%' }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            getRowId={(row: SvodRow) => row.objectId}
            hideFooter
            disableRowSelectionOnClick
            disableVirtualization={import.meta.env.MODE === 'test'}
            sx={quietGridSx}
          />

          {/* Custom footer */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: `1px solid ${tokens.line}`,
              pt: '12px',
              mt: 0,
              fontSize: 12,
              color: tokens.ink3,
            }}
          >
            {/* Left: range */}
            <Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
              Showing{' '}
              <Box
                component="span"
                sx={{
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  color: tokens.ink2,
                }}
              >
                {rangeStart}–{rangeEnd}
              </Box>{' '}
              of{' '}
              <Box
                component="span"
                sx={{
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  color: tokens.ink2,
                }}
              >
                {totalElements.toLocaleString()}
              </Box>
            </Typography>

            {/* Center: aggregates */}
            <Box sx={{ display: 'flex', gap: 3, fontSize: 12, color: tokens.ink3 }}>
              <Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
                Avg{' '}
                <Box
                  component="span"
                  sx={{
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    color: tokens.ink2,
                  }}
                >
                  {pageAvg.toFixed(svodPrecision)}
                </Box>
              </Typography>
              <Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
                Σ page{' '}
                <Box
                  component="span"
                  sx={{
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    color: tokens.ink2,
                  }}
                >
                  {pageSum.toFixed(svodPrecision)}
                </Box>
              </Typography>
            </Box>

            {/* Right: prev / page-of / next */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                sx={{ minWidth: 0, px: '10px', height: 28, fontSize: 12 }}
              >
                ‹ Prev
              </Button>
              <Typography
                sx={{
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  color: tokens.ink3,
                  minWidth: 60,
                  textAlign: 'center',
                }}
              >
                {page + 1} / {totalPages}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                sx={{ minWidth: 0, px: '10px', height: 28, fontSize: 12 }}
              >
                Next ›
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  )
}
