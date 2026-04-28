import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tooltip,
  type SelectChangeEvent,
} from '@mui/material'
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid'
import { useSvod } from '../hooks/useSvod'
import { exportSvodXlsx } from '../api/svod'
import { getDivisions } from '../api/divisions'
import type { SvodRow } from '../types/m02'

type NumericFormatterParams = { value: number }

function formatDecimal(value: number, places: number): string {
  if (value === 0) return ''
  return value.toFixed(places)
}

const columns: GridColDef<SvodRow>[] = [
  {
    field: 'divisionName',
    headerName: 'Division',
    align: 'left',
    headerAlign: 'left',
    width: 120,
  },
  {
    field: 'branchName',
    headerName: 'Branch',
    align: 'left',
    headerAlign: 'left',
    width: 120,
  },
  {
    field: 'objectName',
    headerName: 'Object',
    align: 'left',
    headerAlign: 'left',
    width: 200,
    renderCell: ({ row }: { row: SvodRow }) => (
      <Link to={`/objects/${row.objectId}`}>{row.objectName}</Link>
    ),
  },
  {
    field: 'engineers',
    headerName: 'Assigned Engineers',
    align: 'left',
    headerAlign: 'left',
    width: 280,
    renderCell: ({ value }: { value: string[] | undefined }) => {
      const names = Array.isArray(value) ? value : []
      const displayText = names.length > 0 ? names.join(', ') : '—'
      return names.length > 0 ? (
        <Tooltip title={displayText}>
          <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayText}
          </Box>
        </Tooltip>
      ) : (
        <Box sx={{ color: 'text.secondary' }}>{displayText}</Box>
      )
    },
  },
  {
    field: 'pzvMinutes',
    headerName: 'PZV',
    align: 'right',
    headerAlign: 'right',
    width: 80,
    valueFormatter: ({ value }: NumericFormatterParams) => formatDecimal(value, 2),
  },
  {
    field: 'roundTripMin',
    headerName: 'Travel',
    align: 'right',
    headerAlign: 'right',
    width: 80,
    valueFormatter: ({ value }: NumericFormatterParams) => formatDecimal(value, 2),
  },
  {
    field: 'psMonthlyAvg',
    headerName: 'Fire Alarm',
    align: 'right',
    headerAlign: 'right',
    width: 100,
    valueFormatter: ({ value }: NumericFormatterParams) => formatDecimal(value, 6),
  },
  {
    field: 'videoMonthlyAvg',
    headerName: 'Video',
    align: 'right',
    headerAlign: 'right',
    width: 100,
    valueFormatter: ({ value }: NumericFormatterParams) => formatDecimal(value, 6),
  },
  {
    field: 'osMonthlyAvg',
    headerName: 'Security',
    align: 'right',
    headerAlign: 'right',
    width: 100,
    valueFormatter: ({ value }: NumericFormatterParams) => formatDecimal(value, 6),
  },
  {
    field: 'recordsMonthly',
    headerName: 'Records',
    align: 'right',
    headerAlign: 'right',
    width: 100,
    valueFormatter: ({ value }: NumericFormatterParams) => formatDecimal(value, 6),
  },
  {
    field: 'repairNoTravelMonthly',
    headerName: 'Repair without Travel',
    align: 'right',
    headerAlign: 'right',
    width: 160,
    valueFormatter: ({ value }: NumericFormatterParams) => formatDecimal(value, 6),
  },
  {
    field: 'totalNoTravelMin',
    headerName: 'Maintenance+records+repair(without travel)+Travel, min',
    align: 'right',
    headerAlign: 'right',
    width: 260,
    valueFormatter: ({ value }: NumericFormatterParams) => formatDecimal(value, 6),
  },
  {
    field: 'itogoChisloNoTravel',
    headerName: 'TOTAL Staffing (without travel)',
    align: 'right',
    headerAlign: 'right',
    width: 200,
    valueFormatter: ({ value }: NumericFormatterParams) => formatDecimal(value, 6),
  },
  {
    field: 'repairWithTravelMonthly',
    headerName: 'Repair with Travel',
    align: 'right',
    headerAlign: 'right',
    width: 140,
    valueFormatter: ({ value }: NumericFormatterParams) => formatDecimal(value, 6),
  },
  {
    field: 'totalWithTravelMin',
    headerName: 'Maintenance+records+repair(with travel)+Travel, min',
    align: 'right',
    headerAlign: 'right',
    width: 260,
    valueFormatter: ({ value }: NumericFormatterParams) => formatDecimal(value, 6),
  },
  {
    field: 'itogoChisloWithTravel',
    headerName: 'TOTAL Staffing (with travel)',
    align: 'right',
    headerAlign: 'right',
    width: 200,
    valueFormatter: ({ value }: NumericFormatterParams) => formatDecimal(value, 6),
    cellClassName: 'bold-cell',
  },
  {
    field: 'r1PerVisitTotal',
    headerName: 'R1 across all systems on the object',
    align: 'right',
    headerAlign: 'right',
    width: 220,
    valueFormatter: ({ value }: NumericFormatterParams) => formatDecimal(value, 6),
  },
  {
    field: 'r2PerVisitTotal',
    headerName: 'R2 across all systems on the object',
    align: 'right',
    headerAlign: 'right',
    width: 220,
    valueFormatter: ({ value }: NumericFormatterParams) => formatDecimal(value, 6),
  },
]

export default function SvodPage() {
  const [page, setPage] = useState(0)
  const pageSize = 100
  const [divisionId, setDivisionId] = useState<string>('')
  const [exportError, setExportError] = useState<string | null>(null)

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions'],
    queryFn: getDivisions,
  })

  const { data, isLoading, isError } = useSvod(page, pageSize, divisionId || undefined)

  const handleDivisionChange = (event: SelectChangeEvent<string>) => {
    setDivisionId(event.target.value)
    setPage(0)
  }

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

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (isError) {
    return <Alert severity="error">Failed to load data</Alert>
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="division-filter-label">Division</InputLabel>
          <Select
            labelId="division-filter-label"
            value={divisionId}
            label="Division"
            onChange={handleDivisionChange}
          >
            <MenuItem value="">All divisions</MenuItem>
            {divisions.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button variant="contained" onClick={handleExport}>
          Export XLSX
        </Button>
      </Box>

      {exportError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setExportError(null)}>
          {exportError}
        </Alert>
      )}

      <Box
        sx={{
          height: 600,
          width: '100%',
          '& .bold-cell': {
            fontWeight: 'bold',
          },
        }}
      >
        <DataGrid
          rows={data?.content ?? []}
          columns={columns}
          getRowId={(row: SvodRow) => row.objectId}
          paginationMode="server"
          rowCount={data?.totalElements ?? 0}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={handlePaginationModelChange}
          pageSizeOptions={[100]}
          disableRowSelectionOnClick
          disableVirtualization={import.meta.env.MODE === 'test'}
        />
      </Box>
    </Box>
  )
}
