import { useEffect, useState } from 'react'
import {
  Box,
  Button,
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
import { DivisionCreateSchema } from '../types/division'
import type { DivisionCreate } from '../types/division'
import { useObjectSummary } from '../hooks/useSummary'

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
        <SummaryRow label="Security R1" value={fmt6(data.os_r1_per_visit)} />
        <SummaryRow label="Security R2" value={fmt6(data.os_r2_per_visit)} />
        <SummaryRow label="Fire R1" value={fmt6(data.ps_r1_per_visit)} />
        <SummaryRow label="Fire R2" value={fmt6(data.ps_r2_per_visit)} />
        <SummaryRow label="Video R1" value={fmt6(data.video_r1_per_visit)} />
        <SummaryRow label="Video R2" value={fmt6(data.video_r2_per_visit)} />
        <SummaryRow label="R1 total" value={fmt6(data.r1_per_visit_total)} />
        <SummaryRow label="R2 total" value={fmt6(data.r2_per_visit_total)} />
      </SummaryGroup>

      <SummaryGroup title="Monthly averages">
        <SummaryRow label="Security" value={fmt6(data.os_monthly_avg)} />
        <SummaryRow label="Fire" value={fmt6(data.ps_monthly_avg)} />
        <SummaryRow label="Video" value={fmt6(data.video_monthly_avg)} />
        <SummaryRow label="Records" value={fmt6(data.records_monthly)} />
        <SummaryRow label="Repair without Travel" value={fmt6(data.repair_no_travel_monthly)} />
        <SummaryRow label="Repair with Travel" value={fmt6(data.repair_with_travel_monthly)} />
      </SummaryGroup>

      <SummaryGroup title="Travel">
        <SummaryRow label="PZV" value={fmt2(data.pzv_minutes)} />
        <SummaryRow label="Travel (round-trip)" value={fmt2(data.round_trip_min)} />
      </SummaryGroup>

      <SummaryGroup title="Totals">
        <SummaryRow
          label="Maintenance+records+repair(without travel)+Travel, min"
          value={fmt6(data.total_no_travel_min)}
        />
        <SummaryRow
          label="TOTAL Staffing (without travel)"
          value={fmt6(data.itogo_chislo_no_travel)}
        />
        <SummaryRow
          label="Maintenance+records+repair(with travel)+Travel, min"
          value={fmt6(data.total_with_travel_min)}
        />
        <SummaryRow
          label="TOTAL Staffing (with travel)"
          value={
            <Typography variant="body2" component="span" sx={{ fontWeight: 700 }}>
              {fmt6(data.itogo_chislo_with_travel)}
            </Typography>
          }
        />
      </SummaryGroup>

      <SummaryGroup title="Computed at">
        <SummaryRow label="Computed at" value={data.computed_at ?? '—'} />
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
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [tabValue, setTabValue] = useState(0)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const nameForm = useForm<DivisionCreate>({
    resolver: zodResolver(DivisionCreateSchema),
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
      nameForm.reset({ name: object.name })
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
        <Typography>Available in M-03</Typography>
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
