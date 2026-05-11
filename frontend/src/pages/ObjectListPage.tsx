import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { useNavigate } from 'react-router-dom'
import { tokens } from '../theme'
import { useObjects } from '../hooks/useObjects'
import { useDivisions } from '../hooks/useDivisions'
import { PageHead } from '../components/common/PageHead'
import CreateObjectDialog from '../components/dialogs/CreateObjectDialog'

const PAGE_SIZE = 20

function ObjectStaffingRow({
  objectId,
  name,
  divisionName,
  branchName,
  engineerCount,
  itogoChisloWithTravel,
  navigate,
}: {
  objectId: string
  name: string
  divisionName: string
  branchName: string
  engineerCount: number | null | undefined
  itogoChisloWithTravel: number | null | undefined
  navigate: (path: string) => void
}) {
  const engCount = engineerCount ?? null

  return (
    <TableRow hover onClick={() => navigate(`/objects/${objectId}`)} sx={{ cursor: 'pointer' }}>
      <TableCell>{name}</TableCell>
      <TableCell sx={{ color: tokens.ink3 }}>{divisionName}</TableCell>
      <TableCell sx={{ color: tokens.ink3 }}>{branchName}</TableCell>
      <TableCell sx={{ color: engCount === 0 ? tokens.ink4 : tokens.ink3, textAlign: 'right' }}>
        {engCount === null ? '—' : engCount === 0 ? '—' : engCount}
      </TableCell>
      <TableCell sx={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontWeight: 500 }}>
        {itogoChisloWithTravel != null ? itogoChisloWithTravel.toFixed(4) : '—'}
      </TableCell>
      <TableCell sx={{ width: 32, p: 0, pr: 1, textAlign: 'right' }}>
        <ChevronRightIcon sx={{ fontSize: 16, color: tokens.ink4, display: 'block' }} />
      </TableCell>
    </TableRow>
  )
}

export default function ObjectListPage() {
  const navigate = useNavigate()
  const [selectedDivisionId, setSelectedDivisionId] = useState('')
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const [openObjectDialog, setOpenObjectDialog] = useState(false)

  const { data: objects, isLoading } = useObjects(selectedDivisionId || undefined)
  const { data: divisions, isLoading: divisionsLoading } = useDivisions()

  const branches = useMemo(() => {
    if (!objects) return []
    const seen = new Map<string, string>()
    for (const obj of objects) {
      if (obj.branchId && obj.branchName && !seen.has(obj.branchId)) {
        seen.set(obj.branchId, obj.branchName)
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [objects])

  const filteredObjects = useMemo(() => {
    let result = objects ?? []
    if (selectedBranchId) result = result.filter((o) => o.branchId === selectedBranchId)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((o) => o.name.toLowerCase().includes(q))
    }
    return result
  }, [objects, selectedBranchId, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredObjects.length / PAGE_SIZE))
  const pagedObjects = filteredObjects.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleDivisionChange = (value: string) => {
    setSelectedDivisionId(value)
    setSelectedBranchId('')
    setPage(0)
  }

  if (isLoading || divisionsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  const rangeStart = filteredObjects.length === 0 ? 0 : page * PAGE_SIZE + 1
  const rangeEnd = Math.min((page + 1) * PAGE_SIZE, filteredObjects.length)

  return (
    <Box>
      <PageHead
        crumbs={[{ label: 'Workload', to: '/' }, { label: 'Objects' }]}
        title="Objects"
        subtitle={`${filteredObjects.length.toLocaleString()} objects`}
        actions={
          <Button variant="contained" size="small" onClick={() => setOpenObjectDialog(true)}>
            Create object
          </Button>
        }
      />

      {/* Filter row */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search objects…"
          aria-label="Search objects"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setPage(0)
          }}
          variant="outlined"
          size="small"
          sx={{ width: 260 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 16, color: tokens.ink4 }} />
              </InputAdornment>
            ),
          }}
        />

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Division</InputLabel>
          <Select
            value={selectedDivisionId}
            label="Division"
            onChange={(e) => handleDivisionChange(e.target.value)}
            sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.lineStrong } }}
          >
            <MenuItem value="">All divisions</MenuItem>
            {divisions?.map((div) => (
              <MenuItem key={div.id} value={div.id}>
                {div.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }} disabled={branches.length === 0}>
          <InputLabel>Branch</InputLabel>
          <Select
            value={selectedBranchId}
            label="Branch"
            onChange={(e) => {
              setSelectedBranchId(e.target.value)
              setPage(0)
            }}
            sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.lineStrong } }}
          >
            <MenuItem value="">All branches</MenuItem>
            {branches.map((b) => (
              <MenuItem key={b.id} value={b.id}>
                {b.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {pagedObjects.length > 0 ? (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Object name</TableCell>
                <TableCell>Division</TableCell>
                <TableCell>Branch</TableCell>
                <TableCell sx={{ textAlign: 'right' }}>Eng</TableCell>
                <TableCell>FTE</TableCell>
                <TableCell sx={{ width: 32, p: 0 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedObjects.map((obj) => (
                <ObjectStaffingRow
                  key={obj.id}
                  objectId={obj.id}
                  name={obj.name}
                  divisionName={obj.divisionName ?? '—'}
                  branchName={obj.branchName ?? '—'}
                  engineerCount={obj.engineerCount}
                  itogoChisloWithTravel={obj.itogoChisloWithTravel}
                  navigate={navigate}
                />
              ))}
            </TableBody>
          </Table>

          {/* Pagination footer */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: `1px solid ${tokens.line}`,
              pt: '12px',
              mt: 0,
            }}
          >
            <Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
              Showing{' '}
              <Box
                component="span"
                sx={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", color: tokens.ink2 }}
              >
                {rangeStart}–{rangeEnd}
              </Box>{' '}
              of{' '}
              <Box
                component="span"
                sx={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", color: tokens.ink2 }}
              >
                {filteredObjects.length.toLocaleString()}
              </Box>
            </Typography>

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
        </>
      ) : (
        <Typography sx={{ fontSize: 13, color: tokens.ink3 }}>No objects found</Typography>
      )}

      <CreateObjectDialog open={openObjectDialog} onClose={() => setOpenObjectDialog(false)} />
    </Box>
  )
}
