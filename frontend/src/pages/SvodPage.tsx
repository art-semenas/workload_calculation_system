import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Alert, Box, Button, CircularProgress } from '@mui/material'
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid'
import { useSvod } from '../hooks/useSvod'
import { exportSvodXlsx } from '../api/svod'
import { getDivisions } from '../api/divisions'
import { Num } from '../components/common/Num'
import type { SvodRow } from '../types/m02'

type NumericFormatterParams = { value: number }

const columns: GridColDef<SvodRow>[] = [
  {
    field: 'divisionName',
    headerName: 'DIVISION',
    align: 'left',
    headerAlign: 'left',
    width: 120,
    headerClassName: 'header-uppercase',
  },
  {
    field: 'branchName',
    headerName: 'BRANCH',
    align: 'left',
    headerAlign: 'left',
    width: 120,
    headerClassName: 'header-uppercase',
  },
  {
    field: 'objectName',
    headerName: 'OBJECT',
    align: 'left',
    headerAlign: 'left',
    width: 200,
    headerClassName: 'header-uppercase',
    renderCell: ({ row }: { row: SvodRow }) => (
      <Link to={`/objects/${row.objectId}`}>{row.objectName}</Link>
    ),
  },
  {
    field: 'engineers',
    headerName: 'ENGINEERS',
    align: 'left',
    headerAlign: 'left',
    width: 180,
    headerClassName: 'header-uppercase',
    renderCell: () => '—',
  },
  {
    field: 'pzvMinutes',
    headerName: 'PZV',
    align: 'right',
    headerAlign: 'right',
    width: 80,
    headerClassName: 'header-uppercase',
    renderCell: ({ value }: NumericFormatterParams) => <Num value={value} digits={2} />,
  },
  {
    field: 'roundTripMin',
    headerName: 'TRAVEL',
    align: 'right',
    headerAlign: 'right',
    width: 80,
    headerClassName: 'header-uppercase',
    cellClassName: 'separator-left',
    renderCell: ({ value }: NumericFormatterParams) => <Num value={value} digits={2} />,
  },
  {
    field: 'psMonthlyAvg',
    headerName: 'FIRE ALARM',
    align: 'right',
    headerAlign: 'right',
    width: 100,
    headerClassName: 'header-uppercase',
    cellClassName: 'separator-left',
    renderCell: ({ value }: NumericFormatterParams) => <Num value={value} digits={6} />,
  },
  {
    field: 'videoMonthlyAvg',
    headerName: 'VIDEO',
    align: 'right',
    headerAlign: 'right',
    width: 100,
    headerClassName: 'header-uppercase',
    renderCell: ({ value }: NumericFormatterParams) => <Num value={value} digits={6} />,
  },
  {
    field: 'osMonthlyAvg',
    headerName: 'SECURITY',
    align: 'right',
    headerAlign: 'right',
    width: 100,
    headerClassName: 'header-uppercase',
    renderCell: ({ value }: NumericFormatterParams) => <Num value={value} digits={6} />,
  },
  {
    field: 'recordsMonthly',
    headerName: 'RECORDS',
    align: 'right',
    headerAlign: 'right',
    width: 100,
    headerClassName: 'header-uppercase',
    renderCell: ({ value }: NumericFormatterParams) => <Num value={value} digits={6} />,
  },
  {
    field: 'repairNoTravelMonthly',
    headerName: 'REPAIR NO TRAVEL',
    align: 'right',
    headerAlign: 'right',
    width: 160,
    headerClassName: 'header-uppercase',
    cellClassName: 'separator-left',
    renderCell: ({ value }: NumericFormatterParams) => <Num value={value} digits={6} />,
  },
  {
    field: 'totalNoTravelMin',
    headerName: 'TOTAL NO TRAVEL',
    align: 'right',
    headerAlign: 'right',
    width: 260,
    headerClassName: 'header-uppercase',
    renderCell: ({ value }: NumericFormatterParams) => <Num value={value} digits={6} />,
  },
  {
    field: 'itogoChisloNoTravel',
    headerName: 'ИТОГО STAFFING (NO TRAVEL)',
    align: 'right',
    headerAlign: 'right',
    width: 200,
    headerClassName: 'header-uppercase',
    renderCell: ({ value }: NumericFormatterParams) => <Num value={value} digits={6} />,
  },
  {
    field: 'repairWithTravelMonthly',
    headerName: 'REPAIR WITH TRAVEL',
    align: 'right',
    headerAlign: 'right',
    width: 140,
    headerClassName: 'header-uppercase',
    cellClassName: 'separator-left',
    renderCell: ({ value }: NumericFormatterParams) => <Num value={value} digits={6} />,
  },
  {
    field: 'totalWithTravelMin',
    headerName: 'TOTAL WITH TRAVEL',
    align: 'right',
    headerAlign: 'right',
    width: 260,
    headerClassName: 'header-uppercase',
    renderCell: ({ value }: NumericFormatterParams) => <Num value={value} digits={6} />,
  },
  {
    field: 'itogoChisloWithTravel',
    headerName: 'ИТОГО STAFFING (WITH TRAVEL)',
    align: 'right',
    headerAlign: 'right',
    width: 200,
    headerClassName: 'header-uppercase header-hero',
    cellClassName: 'hero-cell',
    renderCell: ({ value }: NumericFormatterParams) => <Num value={value} digits={6} />,
  },
  {
    field: 'r1PerVisitTotal',
    headerName: 'R1 TOTAL',
    align: 'right',
    headerAlign: 'right',
    width: 220,
    headerClassName: 'header-uppercase',
    cellClassName: 'separator-left',
    renderCell: ({ value }: NumericFormatterParams) => <Num value={value} digits={6} />,
  },
  {
    field: 'r2PerVisitTotal',
    headerName: 'R2 TOTAL',
    align: 'right',
    headerAlign: 'right',
    width: 220,
    headerClassName: 'header-uppercase',
    renderCell: ({ value }: NumericFormatterParams) => <Num value={value} digits={6} />,
  },
]

export default function SvodPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const pageSize = 100
  const divisionId = searchParams.get('division') || ''
  const page = parseInt(searchParams.get('page') || '0', 10)
  const [exportError, setExportError] = useState<string | null>(null)

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions'],
    queryFn: getDivisions,
  })

  const { data, isLoading, isError } = useSvod(page, pageSize, divisionId || undefined)

  const handleDivisionChange = (selectedDivisionId: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev)
      if (selectedDivisionId) {
        newParams.set('division', selectedDivisionId)
      } else {
        newParams.delete('division')
      }
      newParams.set('page', '0')
      return newParams
    })
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
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev)
      newParams.set('page', model.page.toString())
      return newParams
    })
  }

  const calculateTotals = () => {
    const rows = data?.content ?? []
    if (rows.length === 0) {
      return { avgFte: 0, sumFtePage: 0, sumFteAll: 0 }
    }

    const sumFtePage = rows.reduce((sum, row) => sum + row.itogoChisloWithTravel, 0)
    const avgFte = sumFtePage / rows.length
    const sumFteAll =
      (data?.totalElements ?? 0) > 0 ? (sumFtePage / rows.length) * (data?.totalElements ?? 0) : 0

    return { avgFte, sumFtePage, sumFteAll }
  }

  const totals = calculateTotals()
  const pageStart = page * pageSize + 1
  const pageEnd = Math.min((page + 1) * pageSize, data?.totalElements ?? 0)

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
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            p: 0.5,
            backgroundColor: 'var(--bg-sunken)',
            borderRadius: '6px',
          }}
        >
          <Button
            onClick={() => handleDivisionChange('')}
            variant={divisionId === '' ? 'contained' : 'text'}
            size="small"
            sx={{
              backgroundColor: divisionId === '' ? 'white' : 'transparent',
              color: divisionId === '' ? 'var(--ink)' : 'var(--ink)',
              boxShadow: divisionId === '' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
              '&:hover': {
                backgroundColor: divisionId === '' ? 'white' : 'rgba(255,255,255,0.1)',
              },
            }}
          >
            All divisions
          </Button>
          {divisions.map((d) => (
            <Button
              key={d.id}
              onClick={() => handleDivisionChange(d.id)}
              variant={divisionId === d.id ? 'contained' : 'text'}
              size="small"
              sx={{
                backgroundColor: divisionId === d.id ? 'white' : 'transparent',
                color: divisionId === d.id ? 'var(--ink)' : 'var(--ink)',
                boxShadow: divisionId === d.id ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                '&:hover': {
                  backgroundColor: divisionId === d.id ? 'white' : 'rgba(255,255,255,0.1)',
                },
              }}
            >
              {d.name}
            </Button>
          ))}
        </Box>

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
          '& .header-uppercase': {
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          },
          '& .header-hero': {
            fontWeight: 700,
          },
          '& .hero-cell': {
            backgroundColor: 'var(--bg-sunken)',
            fontWeight: 'bold',
          },
          '& .separator-left': {
            borderLeft: '1px dashed var(--line-strong)',
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
          rowHeight={44}
          slots={{
            footer: () => (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 2,
                  borderTop: '1px solid var(--line)',
                  fontSize: '12px',
                }}
              >
                <Box>
                  Showing {pageStart} – {pageEnd} of {data?.totalElements ?? 0} objects
                </Box>
                <Box sx={{ display: 'flex', gap: 3 }}>
                  <Box>
                    Avg FTE (page): <Num value={totals.avgFte} digits={6} />
                  </Box>
                  <Box>
                    Σ FTE (page): <Num value={totals.sumFtePage} digits={6} />
                  </Box>
                  <Box>
                    Σ FTE (all): <Num value={totals.sumFteAll} digits={6} />
                  </Box>
                </Box>
              </Box>
            ),
          }}
        />
      </Box>
    </Box>
  )
}
