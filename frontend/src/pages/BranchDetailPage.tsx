import { useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { useBranch, useUpdateBranch } from '../hooks/useBranches'
import { useCreateObject, useObjects } from '../hooks/useObjects'
import { useObjectSummary } from '../hooks/useSummary'
import { useBranchAggregation } from '../hooks/useAggregations'
import { BranchCreateSchema, type BranchCreate } from '../types/division'
import { ObjectCreateSchema, type ObjectCreate } from '../types/object'

function ObjectStaffingRow({
  objectId,
  name,
  navigate,
}: {
  objectId: string
  name: string
  navigate: (path: string) => void
}) {
  const { data: summary, isLoading } = useObjectSummary(objectId)
  return (
    <TableRow hover onClick={() => navigate(`/objects/${objectId}`)} sx={{ cursor: 'pointer' }}>
      <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
        {objectId.substring(0, 8)}
      </TableCell>
      <TableCell>{name}</TableCell>
      <TableCell>—</TableCell>
      <TableCell align="right">
        {isLoading ? '...' : (summary?.itogoChisloWithTravel.toFixed(2) ?? '—')}
      </TableCell>
    </TableRow>
  )
}

export default function BranchDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [editingName, setEditingName] = useState(false)
  const [openObjectDialog, setOpenObjectDialog] = useState(false)

  const { data: branch, isLoading } = useBranch(id || '')
  const { data: allObjects = [] } = useObjects()
  const { data: branchAgg } = useBranchAggregation(id || '')
  const updateBranch = useUpdateBranch()
  const createObject = useCreateObject()

  const nameForm = useForm<BranchCreate>({
    resolver: zodResolver(BranchCreateSchema),
  })

  const {
    control,
    handleSubmit: handleObjectSubmit,
    reset: resetObjectForm,
  } = useForm<ObjectCreate>({
    resolver: zodResolver(ObjectCreateSchema),
    defaultValues: { name: '', branchId: id || '' },
  })

  const handleEditName = () => {
    if (branch) {
      nameForm.reset({ name: branch.name })
      setEditingName(true)
    }
  }

  const handleSaveName = nameForm.handleSubmit(async (data) => {
    if (id) {
      await updateBranch.mutateAsync({ id, data: { name: data.name } })
      setEditingName(false)
    }
  })

  const handleCancelEdit = () => {
    setEditingName(false)
    nameForm.reset()
  }

  const handleCloseObjectDialog = () => {
    setOpenObjectDialog(false)
    resetObjectForm()
  }

  const handleCreateObject = handleObjectSubmit(async (formData) => {
    await createObject.mutateAsync(formData)
    handleCloseObjectDialog()
  })

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!branch) {
    return <Typography color="error">Branch not found</Typography>
  }

  const branchObjects = allObjects.filter((o) => o.branchId === id)

  const kpiItems = branchAgg
    ? [
        { label: 'Objects', value: branchAgg.objectCount },
        { label: 'Engineers', value: '—' },
        { label: 'Required FTE', value: branchAgg.requiredFte.toFixed(2) },
        {
          label: 'Avg per object',
          value:
            branchAgg.objectCount > 0
              ? (branchAgg.requiredFte / branchAgg.objectCount).toFixed(2)
              : '—',
        },
      ]
    : []

  return (
    <Box>
      <PageHead
        crumbs={[
          { label: 'Workload', to: '/' },
          { label: 'Divisions', to: '/divisions' },
          { label: branch.divisionName, to: `/divisions/${branch.divisionId}` },
          { label: branch.name },
        ]}
        title={branch.name}
        actions={
          !editingName && (
            <Button variant="contained" onClick={handleEditName}>
              Edit branch
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
            label="Branch name"
            size="small"
            autoFocus
          />
          <Button size="small" type="submit" disabled={updateBranch.isPending}>
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

      {/* Add Object Button */}
      <Box sx={{ mb: 3 }}>
        <Button variant="contained" size="small" onClick={() => setOpenObjectDialog(true)}>
          Add object
        </Button>
      </Box>

      {/* Objects Table */}
      {branchObjects.length > 0 ? (
        <SectionBlock label="Objects in this branch">
          <Paper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Object</TableCell>
                  <TableCell>Tier</TableCell>
                  <TableCell align="right">FTE</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {branchObjects.map((obj) => (
                  <ObjectStaffingRow
                    key={obj.id}
                    objectId={obj.id}
                    name={obj.name}
                    navigate={navigate}
                  />
                ))}
              </TableBody>
            </Table>
          </Paper>
        </SectionBlock>
      ) : (
        <Typography color="text.secondary">No objects</Typography>
      )}

      {/* Create Object Dialog */}
      <Dialog open={openObjectDialog} onClose={handleCloseObjectDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add object</DialogTitle>
        <Box
          component="form"
          onSubmit={(e) => {
            void handleCreateObject(e)
          }}
        >
          <DialogContent>
            <FormTextField
              name="name"
              control={control}
              label="Name"
              fullWidth
              autoFocus
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseObjectDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createObject.isPending}>
              Create
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  )
}
