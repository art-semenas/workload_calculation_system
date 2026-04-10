import React, { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  ListSubheader,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { getDivisionBranches } from '../api/divisions'
import { FormTextField } from '../components/common/FormTextField'
import { useCreateObject, useObjects } from '../hooks/useObjects'
import { useDivisions } from '../hooks/useDivisions'
import { ObjectCreateSchema, type ObjectCreate } from '../types/object'
import type { Branch } from '../types/division'

interface GroupedBranchOption {
  branchId: string
  branchName: string
  divisionId: string
  divisionName: string
}

export default function ObjectListPage() {
  const navigate = useNavigate()
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('')
  const [openObjectDialog, setOpenObjectDialog] = useState(false)

  const { data: objects, isLoading } = useObjects(selectedDivisionId || undefined)
  const { data: divisions, isLoading: divisionsLoading } = useDivisions()
  const createObject = useCreateObject()

  const divisionDetailQueries = useQueries({
    queries: openObjectDialog
      ? (divisions ?? []).map((division) => ({
          queryKey: ['divisions', division.id, 'branches'],
          queryFn: () => getDivisionBranches(division.id),
          enabled: openObjectDialog,
        }))
      : [],
  })

  const {
    control,
    handleSubmit: handleObjectSubmit,
    reset,
    setValue,
    watch,
  } = useForm<ObjectCreate>({
    resolver: zodResolver(ObjectCreateSchema),
    defaultValues: {
      name: '',
      branchId: '',
    },
  })

  const watchedBranchId = watch('branchId')

  const groupedBranchOptions: GroupedBranchOption[] = divisionDetailQueries.flatMap(
    (query, index) => {
      const division = divisions?.[index]
      const branches = query.data

      if (!division || !Array.isArray(branches)) {
        return []
      }

      return branches.map((branch: Branch) => ({
        branchId: branch.id,
        branchName: branch.name,
        divisionId: division.id,
        divisionName: division.name,
      }))
    }
  )

  const branchSelectLoading =
    openObjectDialog && divisionDetailQueries.some((query) => query.isLoading)

  const handleCloseObjectDialog = () => {
    setOpenObjectDialog(false)
    reset()
  }

  const handleCreateObject = handleObjectSubmit(async (formData) => {
    await createObject.mutateAsync(formData)
    handleCloseObjectDialog()
  })

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
          Add object
        </Button>
      </Box>

      <Box sx={{ mb: 3, minWidth: 200 }}>
        <FormControl fullWidth>
          <InputLabel>Division</InputLabel>
          <Select
            value={selectedDivisionId}
            label="Division"
            onChange={(e) => setSelectedDivisionId(e.target.value)}
          >
            <MenuItem value="">All divisions</MenuItem>
            {divisions &&
              divisions.map((div) => (
                <MenuItem key={div.id} value={div.id}>
                  {div.name}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      </Box>

      {objects && objects.length > 0 ? (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Division</TableCell>
                <TableCell>Branch</TableCell>
                <TableCell>TOTAL Staffing</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {objects.map((obj) => (
                <TableRow
                  key={obj.id}
                  hover
                  onClick={() => navigate(`/objects/${obj.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{obj.name}</TableCell>
                  <TableCell>{obj.divisionName}</TableCell>
                  <TableCell>{obj.branchName}</TableCell>
                  <TableCell>-</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <Typography color="text.secondary">No objects</Typography>
      )}

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
              sx={{ mt: 2, mb: 2 }}
            />
            <FormControl fullWidth disabled={branchSelectLoading}>
              <InputLabel>Branch</InputLabel>
              <Select
                value={watchedBranchId}
                label="Branch"
                onChange={(e) => setValue('branchId', e.target.value, { shouldValidate: true })}
                inputProps={{ 'data-testid': 'dialog-branch-select' }}
                SelectDisplayProps={
                  {
                    'data-testid': 'dialog-branch-select-btn',
                  } as React.HTMLAttributes<HTMLDivElement>
                }
              >
                <MenuItem value="">Select branch</MenuItem>
                {groupedBranchOptions.map((option, index) => {
                  const previousOption = groupedBranchOptions[index - 1]
                  const startsNewGroup = previousOption?.divisionId !== option.divisionId

                  return [
                    startsNewGroup ? (
                      <ListSubheader key={`group-${option.divisionId}`}>
                        {option.divisionName}
                      </ListSubheader>
                    ) : null,
                    <MenuItem key={option.branchId} value={option.branchId}>
                      {option.branchName}
                    </MenuItem>,
                  ]
                })}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseObjectDialog}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createObject.isPending || !watchedBranchId}
            >
              Create
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  )
}
