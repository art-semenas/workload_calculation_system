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

export default function DashboardPage() {
  const navigate = useNavigate()

  const { data: divisions, isLoading: divisionsLoading } = useDivisionsAggregation()
  const { data: svodPage, isLoading: svodLoading } = useSvod(0, 10)
  const { data: gaps, isLoading: gapsLoading } = useCoverageGaps()

  const topObjects = svodPage?.content ?? []

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Dashboard
      </Typography>

      {/* Section 1: FTE by division */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          FTE by division
        </Typography>
        {divisionsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Division</TableCell>
                <TableCell>TOTAL FTE</TableCell>
                <TableCell>Objects</TableCell>
                <TableCell>Without Engineer</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(divisions ?? []).map((div) => (
                <TableRow
                  key={div.division_id}
                  hover
                  onClick={() => {
                    navigate(`/divisions/${div.division_id}`)
                  }}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{div.division_name}</TableCell>
                  <TableCell>{div.total_fte.toFixed(4)}</TableCell>
                  <TableCell>{div.object_count}</TableCell>
                  <TableCell>{div.gap_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Section 2: Top 10 objects by workload */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Top 10 objects by workload
        </Typography>
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
                <TableCell>TOTAL Staffing</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topObjects.map((row) => (
                <TableRow key={row.object_id}>
                  <TableCell>
                    <Box
                      component="span"
                      sx={{ cursor: 'pointer', color: 'primary.main' }}
                      onClick={() => {
                        navigate(`/objects/${row.object_id}`)
                      }}
                    >
                      {row.object_name}
                    </Box>
                  </TableCell>
                  <TableCell>{row.division_name}</TableCell>
                  <TableCell>{row.itogo_chislo_with_travel.toFixed(6)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Section 3: Uncovered objects */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Uncovered objects
        </Typography>
        {gapsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress />
          </Box>
        ) : (gaps ?? []).length === 0 ? (
          <Typography>No uncovered objects</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Object</TableCell>
                <TableCell>Division</TableCell>
                <TableCell>Branch</TableCell>
                <TableCell>TOTAL FTE</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(gaps ?? []).map((gap) => (
                <TableRow key={gap.object_id}>
                  <TableCell>{gap.object_name}</TableCell>
                  <TableCell>{gap.division_name}</TableCell>
                  <TableCell>{gap.branch_name}</TableCell>
                  <TableCell>{gap.itogo_chislo_with_travel.toFixed(6)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  )
}
