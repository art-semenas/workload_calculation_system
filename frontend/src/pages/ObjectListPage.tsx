import { useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
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
import { useNavigate } from 'react-router-dom'
import { tokens } from '../theme'
import { useObjects } from '../hooks/useObjects'
import { useDivisions } from '../hooks/useDivisions'
import { useObjectSummary } from '../hooks/useSummary'
import CreateObjectDialog from '../components/dialogs/CreateObjectDialog'

function ObjectStaffingRow({
  objectId,
  name,
  divisionName,
  branchName,
  navigate,
}: {
  objectId: string
  name: string
  divisionName: string
  branchName: string
  navigate: (path: string) => void
}) {
  const { data: summary, isLoading } = useObjectSummary(objectId)
  return (
    <TableRow hover onClick={() => navigate(`/objects/${objectId}`)} sx={{ cursor: 'pointer' }}>
      <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
        {objectId.slice(0, 8)}
      </TableCell>
      <TableCell>{name}</TableCell>
      <TableCell>{divisionName}</TableCell>
      <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
        {branchName}
      </TableCell>
      <TableCell
        sx={{
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 500,
          fontSize: 12,
        }}
      >
        {isLoading ? '...' : (summary?.itogoChisloWithTravel.toFixed(6) ?? '—')}
      </TableCell>
    </TableRow>
  )
}

export default function ObjectListPage() {
  const navigate = useNavigate()
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [openObjectDialog, setOpenObjectDialog] = useState(false)

  const { data: objects, isLoading } = useObjects(selectedDivisionId || undefined)
  const { data: divisions, isLoading: divisionsLoading } = useDivisions()

  const filteredObjects =
    objects?.filter((obj) => obj.name.toLowerCase().includes(searchQuery.toLowerCase())) ?? []

  if (isLoading || divisionsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          gap: 2,
        }}
      >
        <Typography variant="h4">Objects</Typography>
        <Button variant="contained" onClick={() => setOpenObjectDialog(true)}>
          Create object
        </Button>
      </Box>

      {/* Filter Row */}
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          mb: 3,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <TextField
          placeholder="Search objects..."
          aria-label="Search objects"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          variant="outlined"
          size="small"
          sx={{ minWidth: 200 }}
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
                    fontFamily: "'JetBrains Mono', monospace",
                    color: tokens.ink4,
                    border: `1px solid ${tokens.line}`,
                    borderRadius: 'var(--r-sm)',
                    px: '4px',
                    py: '1px',
                    lineHeight: 1.4,
                  }}
                >
                  ⌘K
                </Box>
              </InputAdornment>
            ),
          }}
        />

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Division</InputLabel>
          <Select
            value={selectedDivisionId}
            label="Division"
            onChange={(e) => setSelectedDivisionId(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.line },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: tokens.ink4 },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: tokens.ink4 },
            }}
          >
            <MenuItem value="">All divisions</MenuItem>
            {divisions?.map((div) => (
              <MenuItem key={div.id} value={div.id}>
                {div.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }} disabled>
          <InputLabel>Tier</InputLabel>
          <Select
            value=""
            label="Tier"
            sx={{
              '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.line },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: tokens.ink4 },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: tokens.ink4 },
            }}
          >
            <MenuItem value="">All tiers</MenuItem>
          </Select>
        </FormControl>

        <Typography sx={{ ml: 'auto', fontSize: 12, color: 'text.secondary' }}>
          {filteredObjects.length} objects
        </Typography>
      </Box>

      {filteredObjects.length > 0 ? (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace" }}>ID</TableCell>
                <TableCell>Object name</TableCell>
                <TableCell>Division</TableCell>
                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace" }}>Branch</TableCell>
                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                  FTE
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredObjects.map((obj) => (
                <ObjectStaffingRow
                  key={obj.id}
                  objectId={obj.id}
                  name={obj.name}
                  divisionName={obj.divisionName || '—'}
                  branchName={obj.branchName || '—'}
                  navigate={navigate}
                />
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <Typography color="text.secondary">No objects</Typography>
      )}

      <CreateObjectDialog open={openObjectDialog} onClose={() => setOpenObjectDialog(false)} />
    </Box>
  )
}
