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
import { useDivisions } from '../hooks/useDivisions'

export default function DashboardPage() {
  const { data: divisions, isLoading } = useDivisions()

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Dashboard
      </Typography>

      {/* Divisions Overview */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Divisions
        </Typography>
        {divisions && divisions.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Branches</TableCell>
                <TableCell>Objects</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {divisions.map((div) => (
                <TableRow key={div.id}>
                  <TableCell>{div.name}</TableCell>
                  <TableCell>{div.branchCount}</TableCell>
                  <TableCell>{div.objectCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Typography color="text.secondary">No divisions</Typography>
        )}
      </Paper>

      {/* Placeholder sections */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          FTE by Division
        </Typography>
        <Typography color="text.secondary">Data will be available after M-02</Typography>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Uncovered Objects
        </Typography>
        <Typography color="text.secondary">Data will be available after M-03</Typography>
      </Paper>
    </Box>
  )
}
