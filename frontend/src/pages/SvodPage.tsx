import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Tooltip,
  Typography,
} from '@mui/material'
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid'
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

function buildColumns(precision: 2 | 6): GridColDef<SvodRow>[] {
  return [
    {
      field: 'objectName',
      headerName: 'Object',
      align: 'left',
      headerAlign: 'left',
      width: 220,
      renderCell: ({ row }: { row: SvodRow }) => (
        <Link to={`/objects/${row.objectId}`} style={{ color: tokens.ink2, textDecoration: 'none' }}>
          {row.objectName}
        </Link>
      ),
    },
    {
      field: 'engineers',
      headerName: 'Eng',
      align: 'left',
      headerAlign: 'left',
      width: 200,
      renderCell: ({ value }: { value: string[] | undefined }) => {
        const names = Array.isArray(value) ? value : []
        if (names.length === 0) return <Box sx={{ color: tokens.ink4 }}>—</Box>
        const text = names.join(', ')
        return (
          <Tooltip title={text}>
            <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: tokens.ink3 }}>
              {text}
            </Box>
          </Tooltip>
        )
      },
    },
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
  '& .MuiDataGrid-footerContainer': {
    borderTop: `1px solid ${tokens.line}`,
    minHeight: 44,
  },
}

export default function SvodPage() {
  const [page, setPage] = useState(0)
  const pageSize = 100
  const [divisionId, setDivisionId] = useState('')
  const [exportError, setExportError] = useState<string | null>(null)

  const { svodPrecision, setSvodPrecision } = useUiStore()

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions'],
    queryFn: getDivisions,
  })

  const { data, isLoading, isError } = useSvod(page, pageSize, divisionId || undefined)

  const columns = useMemo(() => buildColumns(svodPrecision), [svodPrecision])

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

  const handlePaginationModelChange = (model: GridPaginationModel) => {
    setPage(model.page)
  }

  const totalElements = data?.totalElements ?? 0
  const subtitle = `Consolidated workload across all objects${totalElements > 0 ? ` · ${totalElements.toLocaleString()} rows` : ''}`

  return (
    <Box>
      <PageHead
        crumbs={[{ label: 'Workload', to: '/' }, { label: 'СВОД' }]}
        title="СВОД"
        subtitle={subtitle}
        actions={
          <Button variant="outlined" size="small" onClick={handleExport}>
            Export CSV
          </Button>
        }
      />

      {/* Filter row */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        {/* Division pill segmented control */}
        <Box
          sx={{
            display: 'flex',
            background: tokens.bgSunken,
            borderRadius: 'var(--r-pill)',
            p: '3px',
            gap: '2px',
            flexWrap: 'wrap',
          }}
        >
          {[{ id: '', name: 'All' }, ...divisions].map((d) => {
            const active = divisionId === d.id
            return (
              <Box
                key={d.id}
                component="button"
                onClick={() => {
                  setDivisionId(d.id)
                  setPage(0)
                }}
                sx={{
                  fontSize: 12,
                  fontWeight: active ? 500 : 400,
                  color: active ? tokens.ink : tokens.ink3,
                  background: active ? tokens.bgElev : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--r-pill)',
                  cursor: 'pointer',
                  px: '10px',
                  py: '4px',
                  lineHeight: 1.4,
                  boxShadow: active ? `0 0 0 1px ${tokens.line}` : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {d.name}
              </Box>
            )
          })}
        </Box>

        {/* Precision toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Typography sx={{ fontSize: 12, color: tokens.ink3 }}>Precision:</Typography>
          <Box
            component="button"
            onClick={() => setSvodPrecision(svodPrecision === 2 ? 6 : 2)}
            sx={{
              fontSize: 12,
              color: tokens.accent,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              p: 0,
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              '&:hover': { opacity: 0.8 },
            }}
          >
            {svodPrecision === 2 ? '2 decimals · show full' : 'full · show 2'}
          </Box>
        </Box>
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
            rows={data?.content ?? []}
            columns={columns}
            getRowId={(row: SvodRow) => row.objectId}
            paginationMode="server"
            rowCount={totalElements}
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={handlePaginationModelChange}
            pageSizeOptions={[100]}
            disableRowSelectionOnClick
            disableVirtualization={import.meta.env.MODE === 'test'}
            sx={quietGridSx}
          />
        </Box>
      )}
    </Box>
  )
}
