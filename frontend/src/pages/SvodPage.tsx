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
  type SelectChangeEvent,
} from '@mui/material'
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid'
import { useSvod } from '../hooks/useSvod'
import { exportSvodXlsx } from '../api/svod'
import { getDivisions } from '../api/divisions'
import type { SvodRow } from '../types/m02'

function formatDecimal(value: number, places: number): string {
  if (value === 0) return ''
  return value.toFixed(places)
}

const columns: GridColDef<SvodRow>[] = [
  {
    field: 'import_seq_no',
    headerName: '№',
    align: 'left',
    headerAlign: 'left',
    width: 60,
    valueFormatter: ({ value }: { value: number | null | undefined }) =>
      value != null ? String(value) : '',
  },
  {
    field: 'division_name',
    headerName: 'Division',
    align: 'left',
    headerAlign: 'left',
    width: 120,
  },
  {
    field: 'branch_name',
    headerName: 'Branch',
    align: 'left',
    headerAlign: 'left',
    width: 120,
  },
  {
    field: 'object_name',
    headerName: 'Object',
    align: 'left',
    headerAlign: 'left',
    width: 200,
    renderCell: ({ row }: { row: SvodRow }) => (
      <Link to={`/objects/${row.object_id}`}>{row.object_name}</Link>
    ),
  },
  {
    field: 'engineers',
    headerName: 'Assigned Engineers',
    align: 'left',
    headerAlign: 'left',
    width: 180,
    valueFormatter: ({ value }: { value: string[] }) =>
      Array.isArray(value) ? value.join(', ') : '',
  },
  {
    field: 'pzv_minutes',
    headerName: 'PZV',
    align: 'right',
    headerAlign: 'right',
    width: 80,
    valueFormatter: ({ value }: { value: number }) => formatDecimal(value, 2),
  },
  {
    field: 'round_trip_min',
    headerName: 'Travel',
    align: 'right',
    headerAlign: 'right',
    width: 80,
    valueFormatter: ({ value }: { value: number }) => formatDecimal(value, 2),
  },
  {
    field: 'ps_monthly_avg',
    headerName: 'Fire Alarm',
    align: 'right',
    headerAlign: 'right',
    width: 100,
    valueFormatter: ({ value }: { value: number }) => formatDecimal(value, 6),
  },
  {
    field: 'video_monthly_avg',
    headerName: 'Video',
    align: 'right',
    headerAlign: 'right',
    width: 100,
    valueFormatter: ({ value }: { value: number }) => formatDecimal(value, 6),
  },
  {
    field: 'os_monthly_avg',
    headerName: 'Security',
    align: 'right',
    headerAlign: 'right',
    width: 100,
    valueFormatter: ({ value }: { value: number }) => formatDecimal(value, 6),
  },
  {
    field: 'records_monthly',
    headerName: 'Records',
    align: 'right',
    headerAlign: 'right',
    width: 100,
    valueFormatter: ({ value }: { value: number }) => formatDecimal(value, 6),
  },
  {
    field: 'repair_no_travel_monthly',
    headerName: 'Repair without Travel',
    align: 'right',
    headerAlign: 'right',
    width: 160,
    valueFormatter: ({ value }: { value: number }) => formatDecimal(value, 6),
  },
  {
    field: 'total_no_travel_min',
    headerName: 'Maintenance+records+repair(without travel)+Travel, min',
    align: 'right',
    headerAlign: 'right',
    width: 260,
    valueFormatter: ({ value }: { value: number }) => formatDecimal(value, 6),
  },
  {
    field: 'itogo_chislo_no_travel',
    headerName: 'TOTAL Staffing (without travel)',
    align: 'right',
    headerAlign: 'right',
    width: 200,
    valueFormatter: ({ value }: { value: number }) => formatDecimal(value, 6),
  },
  {
    field: 'repair_with_travel_monthly',
    headerName: 'Repair with Travel',
    align: 'right',
    headerAlign: 'right',
    width: 140,
    valueFormatter: ({ value }: { value: number }) => formatDecimal(value, 6),
  },
  {
    field: 'total_with_travel_min',
    headerName: 'Maintenance+records+repair(with travel)+Travel, min',
    align: 'right',
    headerAlign: 'right',
    width: 260,
    valueFormatter: ({ value }: { value: number }) => formatDecimal(value, 6),
  },
  {
    field: 'itogo_chislo_with_travel',
    headerName: 'TOTAL Staffing (with travel)',
    align: 'right',
    headerAlign: 'right',
    width: 200,
    valueFormatter: ({ value }: { value: number }) => formatDecimal(value, 6),
    cellClassName: 'bold-cell',
  },
  {
    field: 'r1_per_visit_total',
    headerName: 'R1 across all systems on the object',
    align: 'right',
    headerAlign: 'right',
    width: 220,
    valueFormatter: ({ value }: { value: number }) => formatDecimal(value, 6),
  },
  {
    field: 'r2_per_visit_total',
    headerName: 'R2 across all systems on the object',
    align: 'right',
    headerAlign: 'right',
    width: 220,
    valueFormatter: ({ value }: { value: number }) => formatDecimal(value, 6),
  },
]

export default function SvodPage() {
  const [page, setPage] = useState(0)
  const [pageSize] = useState(100)
  const [divisionId, setDivisionId] = useState<string>('')

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
        // export error — silent for PoC
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
          getRowId={(row: SvodRow) => row.object_id}
          paginationMode="server"
          rowCount={data?.total_elements ?? 0}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={handlePaginationModelChange}
          pageSizeOptions={[100]}
          disableRowSelectionOnClick
          disableVirtualization
        />
      </Box>
    </Box>
  )
}
