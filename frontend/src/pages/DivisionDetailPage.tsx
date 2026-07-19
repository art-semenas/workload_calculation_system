import { useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { FormTextField } from '../components/common/FormTextField'
import { PageHead } from '../components/common/PageHead'
import { KPIRow } from '../components/common/KPIRow'
import { SectionBlock } from '../components/common/SectionBlock'
import { CreateBranchDialog } from '../components/dialogs/CreateBranchDialog'
import { useDivision, useDivisionBranches, useUpdateDivision } from '../hooks/useDivisions'
import {
  useBranchesAggregation,
  useDivisionAggregation,
  useCoverageGaps,
} from '../hooks/useAggregations'
import { DivisionCreateSchema, type DivisionCreate } from '../types/division'
import { handleFormError } from '../utils/errorMessages'

export default function DivisionDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [editingName, setEditingName] = useState(false)
  const [openBranchDialog, setOpenBranchDialog] = useState(false)

  const { data: division, isLoading } = useDivision(id ?? '')
  const { data: branches = [], isLoading: branchesLoading } = useDivisionBranches(id ?? '')
  const updateDivision = useUpdateDivision()

  const { data: divAgg } = useDivisionAggregation(id ?? '')
  const { data: gaps } = useCoverageGaps(id)
  const { data: branchAggs = [] } = useBranchesAggregation()
  const branchAggById = Object.fromEntries(branchAggs.map((b) => [b.branchId, b]))

  const nameForm = useForm<DivisionCreate>({
    resolver: zodResolver(DivisionCreateSchema),
  })

  const handleEditName = () => {
    if (division) {
      nameForm.reset({ name: division.name })
      setEditingName(true)
    }
  }

  const handleSaveName = nameForm.handleSubmit(async (data) => {
    if (!id) return
    try {
      await updateDivision.mutateAsync({ id, data: { name: data.name } })
      setEditingName(false)
    } catch (error) {
      handleFormError(error, (message) => nameForm.setError('name', { type: 'server', message }))
    }
  })

  const handleCancelEdit = () => {
    setEditingName(false)
    nameForm.reset()
  }

  if (isLoading || branchesLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!division) {
    return <Typography color="error">Division not found</Typography>
  }

  const kpiItems = divAgg
    ? [
        { label: 'Objects', value: divAgg.objectCount },
        { label: 'Engineers', value: divAgg.engineersTotal },
        { label: 'Required FTE', value: divAgg.requiredFte.toFixed(2) },
        {
          label: 'Utilisation',
          value:
            divAgg.engineersTotal > 0
              ? (divAgg.staffingNeed / divAgg.engineersTotal).toFixed(2)
              : '—',
          tone:
            divAgg.engineersTotal > 0 && divAgg.staffingNeed / divAgg.engineersTotal > 1.0
              ? 'danger'
              : divAgg.engineersTotal > 0 && divAgg.staffingNeed / divAgg.engineersTotal > 0.9
                ? 'warn'
                : 'ok',
        },
      ]
    : []

  return (
    <Box>
      <PageHead
        crumbs={[
          { label: 'Workload', to: '/' },
          { label: 'Divisions', to: '/divisions' },
          { label: division.name },
        ]}
        title={division.name}
        actions={
          !editingName && (
            <Button variant="contained" onClick={handleEditName}>
              Edit division
            </Button>
          )
        }
      />

      {editingName && (
        <Box
          component="form"
          onSubmit={(e) => {
            void handleSaveName(e)
          }}
          sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 3 }}
        >
          <FormTextField
            name="name"
            control={nameForm.control}
            label="Division name"
            size="small"
            autoFocus
          />
          <Button size="small" type="submit" disabled={updateDivision.isPending}>
            Save
          </Button>
          <Button size="small" onClick={handleCancelEdit}>
            Cancel
          </Button>
        </Box>
      )}

      {kpiItems.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <KPIRow items={kpiItems} />
        </Box>
      )}

      {/* Add Branch Button */}
      <Box sx={{ mb: 3 }}>
        <Button variant="contained" size="small" onClick={() => setOpenBranchDialog(true)}>
          Add branch
        </Button>
      </Box>

      {/* Branches Table */}
      {branches.length > 0 ? (
        <SectionBlock label="Branches">
          <Paper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Branch</TableCell>
                  <TableCell align="right">Objects</TableCell>
                  <TableCell align="right">FTE req.</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow
                    key={branch.id}
                    hover
                    onClick={() => navigate(`/branches/${branch.id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{branch.name}</TableCell>
                    <TableCell align="right">{branch.objectCount}</TableCell>
                    <TableCell align="right">
                      {branchAggById[branch.id]?.requiredFte.toFixed(2) ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </SectionBlock>
      ) : (
        <Typography color="text.secondary">No branches</Typography>
      )}

      {/* Coverage Gaps Section */}
      {gaps !== undefined && gaps.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Objects without an assigned engineer
          </Typography>
          <Paper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Object</TableCell>
                  <TableCell>Load</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {gaps.map((gap) => (
                  <TableRow key={gap.objectId}>
                    <TableCell>{gap.objectName}</TableCell>
                    <TableCell>{gap.itogoChisloWithTravel.toFixed(6)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* Create Branch Dialog */}
      {division && (
        <CreateBranchDialog
          open={openBranchDialog}
          onClose={() => setOpenBranchDialog(false)}
          divisionId={division.id}
          divisionName={division.name}
        />
      )}
    </Box>
  )
}
