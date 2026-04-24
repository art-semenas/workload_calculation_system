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
                  key={div.divisionId}
                  hover
                  onClick={() => {
                    navigate(`/divisions/${div.divisionId}`)
                  }}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{div.divisionName}</TableCell>
                  <TableCell>{div.requiredFte.toFixed(4)}</TableCell>
                  <TableCell>{div.objectCount}</TableCell>
                  <TableCell>{div.coverageGapCount}</TableCell>
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
                <TableRow key={row.objectId}>
                  <TableCell>
                    <Box
                      component="span"
                      sx={{ cursor: 'pointer', color: 'primary.main' }}
                      onClick={() => {
                        navigate(`/objects/${row.objectId}`)
                      }}
                    >
                      {row.objectName}
                    </Box>
                  </TableCell>
                  <TableCell>{row.divisionName}</TableCell>
                  <TableCell>{row.itogoChisloWithTravel.toFixed(6)}</TableCell>
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
                <TableRow key={gap.objectId}>
                  <TableCell>{gap.objectName}</TableCell>
                  <TableCell>{gap.divisionName}</TableCell>
                  <TableCell>{gap.branchName}</TableCell>
                  <TableCell>{gap.itogoChisloWithTravel.toFixed(6)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  )
}
