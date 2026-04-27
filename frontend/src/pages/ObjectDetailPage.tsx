import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
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
import { CapBar } from '../components/common/CapBar'

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

// Right rail card components
function HeroCard({ objectId }: { objectId: string }) {
  const { data, isLoading } = useObjectSummary(objectId)

  if (isLoading) {
    return (
      <Card sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={24} />
      </Card>
    )
  }

  if (!data) {
    return null
  }

  const fmt6 = (v: number) => v.toFixed(6)
  const delta = data.itogoChisloWithTravel - data.itogoChisloNoTravel

  return (
    <Card
      sx={{
        p: 3,
        background: 'var(--ink)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          TOTAL STAFFING WITH TRAVEL
        </Typography>
        <Typography
          sx={{
            fontSize: '42px',
            fontWeight: 600,
            lineHeight: 1,
            fontFamily: "'JetBrains Mono', monospace",
            mt: 0.5,
          }}
        >
          {fmt6(data.itogoChisloWithTravel)}
        </Typography>
      </Box>

      <Box sx={{ fontSize: '12px', opacity: 0.8 }}>
        <Box>Without travel: {fmt6(data.itogoChisloNoTravel)}</Box>
        <Box>Delta: {fmt6(delta)}</Box>
      </Box>

      <Box
        sx={{
          fontSize: '11px',
          opacity: 0.6,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          pt: 2,
        }}
      >
        Recomputed {data.computedAt ? `at ${data.computedAt}` : 'recently'} · H1 2026
      </Box>
    </Card>
  )
}

function SystemAveragesCard({ objectId }: { objectId: string }) {
  const { data, isLoading } = useObjectSummary(objectId)

  if (isLoading || !data) {
    return null
  }

  const systems = [
    { label: 'ОС', value: data.osMonthlyAvg, color: '#3a4fcf' },
    { label: 'ПС', value: data.psMonthlyAvg, color: '#a66600' },
    { label: 'Видео', value: data.videoMonthlyAvg, color: '#2d7a4a' },
    { label: 'Records', value: data.recordsMonthly, color: '#6b6a64' },
  ]

  return (
    <Card sx={{ p: 3 }}>
      <Typography
        variant="subtitle2"
        sx={{ mb: 2, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}
      >
        Per-system monthly avg
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {systems.map((sys) => (
          <Box
            key={sys.label}
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Typography variant="body2">{sys.label}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, ml: 1 }}>
              <CapBar value={sys.value} max={0.1} width={80} />
              <Typography
                variant="body2"
                sx={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '12px',
                  minWidth: '50px',
                  textAlign: 'right',
                }}
              >
                {sys.value.toFixed(6)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Card>
  )
}

function VisitBreakdownCard({ objectId }: { objectId: string }) {
  const { data, isLoading } = useObjectSummary(objectId)

  if (isLoading || !data) {
    return null
  }

  const fmt6 = (v: number) => v.toFixed(6)

  return (
    <Card sx={{ p: 3 }}>
      <Typography
        variant="subtitle2"
        sx={{ mb: 2, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}
      >
        Per-visit breakdown
      </Typography>
      <Grid container spacing={1}>
        <Grid item xs={6}>
          <Box>
            <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary' }}>
              R1 total
            </Typography>
            <Typography
              sx={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {fmt6(data.r1PerVisitTotal)}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box>
            <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary' }}>
              R2 total
            </Typography>
            <Typography
              sx={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {fmt6(data.r2PerVisitTotal)}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box>
            <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary' }}>
              PZV
            </Typography>
            <Typography
              sx={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {data.pzvMinutes.toFixed(2)}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box>
            <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary' }}>
              Round-trip
            </Typography>
            <Typography
              sx={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {data.roundTripMin.toFixed(2)}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Card>
  )
}

function EngineersCard() {
  return (
    <Card
      sx={{
        p: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '120px',
      }}
    >
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        No engineers assigned
      </Typography>
    </Card>
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

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Per-visit breakdown
        </Typography>
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Security R1
            </Typography>
            <Typography variant="body2">{fmt6(data.osR1PerVisit)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Security R2
            </Typography>
            <Typography variant="body2">{fmt6(data.osR2PerVisit)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Fire R1
            </Typography>
            <Typography variant="body2">{fmt6(data.psR1PerVisit)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Fire R2
            </Typography>
            <Typography variant="body2">{fmt6(data.psR2PerVisit)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Video R1
            </Typography>
            <Typography variant="body2">{fmt6(data.videoR1PerVisit)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Video R2
            </Typography>
            <Typography variant="body2">{fmt6(data.videoR2PerVisit)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              R1 total
            </Typography>
            <Typography variant="body2">{fmt6(data.r1PerVisitTotal)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              R2 total
            </Typography>
            <Typography variant="body2">{fmt6(data.r2PerVisitTotal)}</Typography>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Monthly averages
        </Typography>
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Security
            </Typography>
            <Typography variant="body2">{fmt6(data.osMonthlyAvg)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Fire
            </Typography>
            <Typography variant="body2">{fmt6(data.psMonthlyAvg)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Video
            </Typography>
            <Typography variant="body2">{fmt6(data.videoMonthlyAvg)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Records
            </Typography>
            <Typography variant="body2">{fmt6(data.recordsMonthly)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Repair without Travel
            </Typography>
            <Typography variant="body2">{fmt6(data.repairNoTravelMonthly)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Repair with Travel
            </Typography>
            <Typography variant="body2">{fmt6(data.repairWithTravelMonthly)}</Typography>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Travel
        </Typography>
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              PZV
            </Typography>
            <Typography variant="body2">{data.pzvMinutes.toFixed(2)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Travel (round-trip)
            </Typography>
            <Typography variant="body2">{data.roundTripMin.toFixed(2)}</Typography>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Totals
        </Typography>
        <Grid container spacing={1}>
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              Maintenance+records+repair(without travel)+Travel, min
            </Typography>
            <Typography variant="body2">{fmt6(data.totalNoTravelMin)}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              TOTAL Staffing (without travel)
            </Typography>
            <Typography variant="body2">{fmt6(data.itogoChisloNoTravel)}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              Maintenance+records+repair(with travel)+Travel, min
            </Typography>
            <Typography variant="body2">{fmt6(data.totalWithTravelMin)}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              TOTAL Staffing (with travel)
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {fmt6(data.itogoChisloWithTravel)}
            </Typography>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Computed at
        </Typography>
        <Typography variant="body2">{data.computedAt ?? '—'}</Typography>
      </Box>
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
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
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

      {/* Tabs with styled underline */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="object tabs"
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: 'var(--ink)',
              height: '2px',
            },
            '& .MuiTab-root': {
              color: 'text.secondary',
              '&.Mui-selected': {
                color: 'text.primary',
              },
            },
          }}
        >
          <Tab label="Equipment" id="tab-0" aria-controls="tabpanel-0" />
          <Tab label="Records" id="tab-1" aria-controls="tabpanel-1" />
          <Tab label="Repairs" id="tab-2" aria-controls="tabpanel-2" />
          <Tab label="Travel" id="tab-3" aria-controls="tabpanel-3" />
          <Tab label="Engineers" id="tab-4" aria-controls="tabpanel-4" />
          <Tab label="Summary" id="tab-5" aria-controls="tabpanel-5" />
        </Tabs>
      </Box>

      {/* Main content with right rail on Equipment tab */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: tabValue === 0 ? '1fr 320px' : '1fr',
          gap: 3,
        }}
      >
        {/* Left column: Tab panels */}
        <Box>
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
            <Typography>Available in M-03</Typography>
          </TabPanel>
          <TabPanel value={tabValue} index={5}>
            <SummaryTab objectId={id ?? ''} />
          </TabPanel>
        </Box>

        {/* Right rail: 4 stacked cards (only on Equipment tab) */}
        {tabValue === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <HeroCard objectId={id ?? ''} />
            <SystemAveragesCard objectId={id ?? ''} />
            <VisitBreakdownCard objectId={id ?? ''} />
            <EngineersCard />
          </Box>
        )}
      </Box>

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
