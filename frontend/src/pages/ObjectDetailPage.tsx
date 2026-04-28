import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import CancelIcon from '@mui/icons-material/Cancel'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { useCreateObject, useDeleteObject, useObject, useUpdateObject } from '../hooks/useObjects'
import { useDivision, useDivisions } from '../hooks/useDivisions'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { FormTextField } from '../components/common/FormTextField'
import { EquipmentTab } from '../components/equipment/EquipmentTab'
import { RecordsTab } from '../components/records/RecordsTab'
import { RepairsTab } from '../components/repairs/RepairsTab'
import { TravelTab } from '../components/travel/TravelTab'
import { ObjectCreateSchema, ObjectUpdateSchema } from '../types/object'
import type { ObjectCreate, ObjectUpdate } from '../types/object'
import { useObjectSummary } from '../hooks/useSummary'
import {
  useObjectEngineers,
  useAssignEngineerToObject,
  useRemoveEngineerFromObject,
} from '../hooks/useObjectEngineers'
import { useEngineers } from '../hooks/useEngineers'
import type { EngineerStatus } from '../types/engineer'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <Grid item xs={6}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography variant="body2">{value}</Typography>
      </Grid>
    </>
  )
}

function SummaryGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        {title}
      </Typography>
      <Grid container spacing={1}>
        {children}
      </Grid>
    </Box>
  )
}

function EngineersTab({ objectId }: { objectId: string }) {
  const navigate = useNavigate()
  const { data: assignedEngineers, isLoading } = useObjectEngineers(objectId)
  const { data: allEngineers } = useEngineers()
  const assignMutation = useAssignEngineerToObject(objectId)
  const removeMutation = useRemoveEngineerFromObject(objectId)
  const [showTravelBanner, setShowTravelBanner] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedEngineer, setSelectedEngineer] = useState<string | null>(null)
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)
  const [engineerToRemove, setEngineerToRemove] = useState<string | null>(null)

  const getStatusChipColor = (status: EngineerStatus) => {
    switch (status) {
      case 'NORMAL':
        return 'success'
      case 'WARNING':
        return 'warning'
      case 'OVERLOADED':
        return 'error'
      default:
        return 'default'
    }
  }

  const getStatusChipIcon = (status: EngineerStatus) => {
    switch (status) {
      case 'NORMAL':
        return <CheckCircleIcon />
      case 'WARNING':
        return <WarningIcon />
      case 'OVERLOADED':
        return <CancelIcon />
      default:
        return <CheckCircleIcon />
    }
  }

  const handleAssignConfirm = async () => {
    if (selectedEngineer) {
      await assignMutation.mutateAsync(selectedEngineer)
      setShowTravelBanner(true)
      setAssignDialogOpen(false)
      setSelectedEngineer(null)
    }
  }

  const handleRemoveConfirm = async () => {
    if (engineerToRemove) {
      await removeMutation.mutateAsync(engineerToRemove)
      setRemoveConfirmOpen(false)
      setEngineerToRemove(null)
    }
  }

  const activeEngineers = useMemo(
    () => allEngineers?.filter((e) => e.isActive) ?? [],
    [allEngineers]
  )

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Heading and Assign Button */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Assigned engineers
        </Typography>
        <Button variant="contained" onClick={() => setAssignDialogOpen(true)}>
          Assign engineer
        </Button>
      </Box>

      {/* Travel Review Banner */}
      {showTravelBanner && (
        <Alert severity="info" sx={{ mt: 1 }} onClose={() => setShowTravelBanner(false)}>
          Check travel data — travel time may differ for the new engineer
        </Alert>
      )}

      {/* Engineers Table */}
      {assignedEngineers && assignedEngineers.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="left">Engineer</TableCell>
                <TableCell align="right">Object Share</TableCell>
                <TableCell align="center">Utilization</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignedEngineers.map((engineer) => (
                <TableRow key={engineer.engineerId}>
                  <TableCell
                    align="left"
                    sx={{ cursor: 'pointer', color: 'primary.main' }}
                    onClick={() => navigate(`/engineers/${engineer.engineerId}`)}
                  >
                    {engineer.engineerName}
                  </TableCell>
                  <TableCell align="right">{engineer.objectShare.toFixed(4)}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`${Math.round(engineer.loadRatio * 100)}%`}
                      color={getStatusChipColor(engineer.status)}
                      icon={getStatusChipIcon(engineer.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        setEngineerToRemove(engineer.engineerId)
                        setRemoveConfirmOpen(true)
                      }}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography color="text.secondary">No engineers assigned</Typography>
      )}

      {/* Assign Engineer Dialog */}
      <Dialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Assign engineer</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Autocomplete
            options={activeEngineers}
            getOptionLabel={(option) => `${option.name} (${Math.round(option.loadRatio * 100)}%)`}
            value={activeEngineers.find((e) => e.id === selectedEngineer) || null}
            onChange={(_, value) => setSelectedEngineer(value?.id ?? null)}
            renderInput={(params) => <TextField {...params} label="Engineer" />}
            renderOption={(props, option) => (
              <li {...props}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span>{option.name}</span>
                  <Chip
                    label={`${Math.round(option.loadRatio * 100)}%`}
                    color={getStatusChipColor(option.status)}
                    icon={getStatusChipIcon(option.status)}
                    size="small"
                  />
                </Box>
              </li>
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => void handleAssignConfirm()}
            variant="contained"
            disabled={!selectedEngineer || assignMutation.isPending}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={removeConfirmOpen} onClose={() => setRemoveConfirmOpen(false)}>
        <DialogTitle>Remove engineer?</DialogTitle>
        <DialogContent>
          <Typography>
            This will remove the engineer from this object and recalculate workload.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={() => void handleRemoveConfirm()}
            color="error"
            variant="contained"
            disabled={removeMutation.isPending}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function SummaryTab({ objectId }: { objectId: string }) {
  const { data, isLoading } = useObjectSummary(objectId)

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!data) {
    return <Typography>No data</Typography>
  }

  const fmt6 = (v: number) => v.toFixed(6)
  const fmt2 = (v: number) => v.toFixed(2)

  return (
    <Box>
      <SummaryGroup title="Per-visit breakdown">
        <SummaryRow label="Security R1" value={fmt6(data.osR1PerVisit)} />
        <SummaryRow label="Security R2" value={fmt6(data.osR2PerVisit)} />
        <SummaryRow label="Fire R1" value={fmt6(data.psR1PerVisit)} />
        <SummaryRow label="Fire R2" value={fmt6(data.psR2PerVisit)} />
        <SummaryRow label="Video R1" value={fmt6(data.videoR1PerVisit)} />
        <SummaryRow label="Video R2" value={fmt6(data.videoR2PerVisit)} />
        <SummaryRow label="R1 total" value={fmt6(data.r1PerVisitTotal)} />
        <SummaryRow label="R2 total" value={fmt6(data.r2PerVisitTotal)} />
      </SummaryGroup>

      <SummaryGroup title="Monthly averages">
        <SummaryRow label="Security" value={fmt6(data.osMonthlyAvg)} />
        <SummaryRow label="Fire" value={fmt6(data.psMonthlyAvg)} />
        <SummaryRow label="Video" value={fmt6(data.videoMonthlyAvg)} />
        <SummaryRow label="Records" value={fmt6(data.recordsMonthly)} />
        <SummaryRow label="Repair without Travel" value={fmt6(data.repairNoTravelMonthly)} />
        <SummaryRow label="Repair with Travel" value={fmt6(data.repairWithTravelMonthly)} />
      </SummaryGroup>

      <SummaryGroup title="Travel">
        <SummaryRow label="PZV" value={fmt2(data.pzvMinutes)} />
        <SummaryRow label="Travel (round-trip)" value={fmt2(data.roundTripMin)} />
      </SummaryGroup>

      <SummaryGroup title="Totals">
        <SummaryRow
          label="Maintenance+records+repair(without travel)+Travel, min"
          value={fmt6(data.totalNoTravelMin)}
        />
        <SummaryRow
          label="TOTAL Staffing (without travel)"
          value={fmt6(data.itogoChisloNoTravel)}
        />
        <SummaryRow
          label="Maintenance+records+repair(with travel)+Travel, min"
          value={fmt6(data.totalWithTravelMin)}
        />
        <SummaryRow
          label="TOTAL Staffing (with travel)"
          value={
            <Typography variant="body2" component="span" sx={{ fontWeight: 700 }}>
              {fmt6(data.itogoChisloWithTravel)}
            </Typography>
          }
        />
      </SummaryGroup>

      <SummaryGroup title="Computed at">
        <SummaryRow label="Computed at" value={data.computedAt ?? '—'} />
      </SummaryGroup>
    </Box>
  )
}

interface ObjectDetailPageProps {
  mode: 'create' | 'edit' | 'detail'
}

function CreateObjectForm() {
  const navigate = useNavigate()
  const [divisionId, setDivisionId] = useState<string>('')

  const { data: divisions, isLoading: divisionsLoading } = useDivisions()
  const { data: divisionDetail, isLoading: divisionDetailLoading } = useDivision(
    divisionId || undefined
  )
  const createObject = useCreateObject()

  const { control, handleSubmit, setValue, watch } = useForm<ObjectCreate>({
    resolver: zodResolver(ObjectCreateSchema),
    defaultValues: { name: '', branchId: '', address: '' },
  })

  const watchedBranchId = watch('branchId')

  const onSubmit = handleSubmit(async (data) => {
    const result = await createObject.mutateAsync(data)
    navigate(`/objects/${result.id}`)
  })

  if (divisionsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <RouterLink to="/objects">Objects</RouterLink>
        {' > '}
        <Typography component="span">New Object</Typography>
      </Box>

      <Typography variant="h4" sx={{ mb: 3 }}>
        New Object
      </Typography>

      <Box
        component="form"
        onSubmit={(e) => {
          void onSubmit(e)
        }}
        sx={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <FormTextField name="name" control={control} label="Name" fullWidth autoFocus />
        <FormTextField name="address" control={control} label="Address" fullWidth />

        <FormControl fullWidth>
          <InputLabel>Division</InputLabel>
          <Select
            value={divisionId}
            label="Division"
            onChange={(e) => {
              setDivisionId(e.target.value)
              setValue('branchId', '', { shouldValidate: false })
            }}
          >
            <MenuItem value="">Select division</MenuItem>
            {divisions?.map((div) => (
              <MenuItem key={div.id} value={div.id}>
                {div.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth disabled={!divisionId || divisionDetailLoading}>
          <InputLabel>Branch</InputLabel>
          <Select
            value={watchedBranchId}
            label="Branch"
            onChange={(e) => setValue('branchId', e.target.value, { shouldValidate: true })}
          >
            <MenuItem value="">Select branch</MenuItem>
            {divisionDetail?.branches.map((branch) => (
              <MenuItem key={branch.id} value={branch.id}>
                {branch.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button
            type="submit"
            variant="contained"
            disabled={createObject.isPending || !watchedBranchId}
          >
            Create
          </Button>
          <Button onClick={() => navigate('/objects')}>Cancel</Button>
        </Box>
      </Box>
    </Box>
  )
}

function EditObjectForm({ id }: { id: string }) {
  const navigate = useNavigate()
  const { data: object, isLoading } = useObject(id)
  const updateObject = useUpdateObject()

  const { control, handleSubmit, reset } = useForm<ObjectUpdate>({
    resolver: zodResolver(ObjectUpdateSchema),
    defaultValues: { name: '', branchId: '', address: '' },
  })

  useEffect(() => {
    if (object) {
      reset({
        name: object.name,
        branchId: object.branchId,
        address: object.address ?? '',
      })
    }
  }, [object, reset])

  const onSubmit = handleSubmit(async (data) => {
    await updateObject.mutateAsync({ id, data })
    navigate(`/objects/${id}`)
  })

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!object) {
    return <Typography color="error">Object not found</Typography>
  }

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <RouterLink to="/divisions">Divisions</RouterLink>
        {' > '}
        <RouterLink to={`/branches/${object.branchId}`}>{object.branchName}</RouterLink>
        {' > '}
        <RouterLink to={`/objects/${id}`}>{object.name}</RouterLink>
        {' > '}
        <Typography component="span">Edit</Typography>
      </Box>

      <Typography variant="h4" sx={{ mb: 3 }}>
        Edit Object
      </Typography>

      <Box
        component="form"
        onSubmit={(e) => {
          void onSubmit(e)
        }}
        sx={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <FormTextField name="name" control={control} label="Name" fullWidth autoFocus />
        <FormTextField name="address" control={control} label="Address" fullWidth />

        <TextField
          label="Branch"
          value={object.branchName ?? ''}
          disabled
          fullWidth
          helperText="Branch cannot be changed here. Create a new object to assign a different branch."
        />

        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button type="submit" variant="contained" disabled={updateObject.isPending}>
            Save
          </Button>
          <Button onClick={() => navigate(`/objects/${id}`)}>Cancel</Button>
        </Box>
      </Box>
    </Box>
  )
}

export default function ObjectDetailPage({ mode }: ObjectDetailPageProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tabValue, setTabValue] = useState(0)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const nameForm = useForm<ObjectUpdate>({
    resolver: zodResolver(ObjectUpdateSchema),
  })

  const { data: object, isLoading } = useObject(mode !== 'create' ? id : undefined)
  const deleteObject = useDeleteObject()
  const updateObject = useUpdateObject()

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleDeleteConfirm = async () => {
    if (id) {
      await deleteObject.mutateAsync(id)
      navigate('/objects')
    }
  }

  const handleEditName = () => {
    if (object) {
      nameForm.reset({ name: object.name, branchId: object.branchId })
      setEditingName(true)
    }
  }

  const handleSaveName = nameForm.handleSubmit(async (data) => {
    if (id && object) {
      await updateObject.mutateAsync({
        id,
        data: { name: data.name, branchId: object.branchId },
      })
      setEditingName(false)
    }
  })

  const handleCancelEdit = () => {
    setEditingName(false)
    nameForm.reset()
  }

  if (mode === 'create') {
    return <CreateObjectForm />
  }

  if (mode === 'edit' && id) {
    return <EditObjectForm id={id} />
  }

  // detail mode
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!object) {
    return <Typography color="error">Object not found</Typography>
  }

  return (
    <Box>
      {/* Breadcrumb */}
      <Box sx={{ mb: 2 }}>
        <RouterLink to="/divisions">Divisions</RouterLink>
        {' > '}
        <RouterLink to={`/branches/${object.branchId}`}>{object.branchName}</RouterLink>
        {' > '}
        <Typography component="span">{object.name}</Typography>
      </Box>

      {/* Object Name with Edit */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {editingName ? (
            <Box
              component="form"
              onSubmit={(e) => {
                void handleSaveName(e)
              }}
              sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}
            >
              <FormTextField
                name="name"
                control={nameForm.control}
                label="Object name"
                size="small"
                autoFocus
              />
              <Button size="small" type="submit" disabled={updateObject.isPending}>
                Save
              </Button>
              <Button size="small" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </Box>
          ) : (
            <>
              <Typography variant="h4">{object.name}</Typography>
              <IconButton size="small" aria-label="Edit name" onClick={handleEditName}>
                <EditOutlinedIcon />
              </IconButton>
            </>
          )}
        </Box>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteOutlinedIcon />}
          onClick={() => setOpenDeleteDialog(true)}
        >
          Delete object
        </Button>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="object tabs">
          <Tab label="Equipment" id="tab-0" aria-controls="tabpanel-0" />
          <Tab label="Records" id="tab-1" aria-controls="tabpanel-1" />
          <Tab label="Repairs" id="tab-2" aria-controls="tabpanel-2" />
          <Tab label="Travel" id="tab-3" aria-controls="tabpanel-3" />
          <Tab label="Engineers" id="tab-4" aria-controls="tabpanel-4" />
          <Tab label="Summary" id="tab-5" aria-controls="tabpanel-5" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <EquipmentTab objectId={id ?? ''} />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <RecordsTab objectId={id ?? ''} />
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        <RepairsTab objectId={id ?? ''} />
      </TabPanel>
      <TabPanel value={tabValue} index={3}>
        <TravelTab objectId={id ?? ''} />
      </TabPanel>
      <TabPanel value={tabValue} index={4}>
        <EngineersTab objectId={id ?? ''} />
      </TabPanel>
      <TabPanel value={tabValue} index={5}>
        <SummaryTab objectId={id ?? ''} />
      </TabPanel>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={openDeleteDialog}
        title="Delete object?"
        message={`Deleting "${object.name}" will also delete all related equipment, records, repairs, and travel data. This action cannot be undone.`}
        onConfirm={() => {
          void handleDeleteConfirm()
        }}
        onCancel={() => setOpenDeleteDialog(false)}
        confirmLabel="Delete"
      />
    </Box>
  )
}
