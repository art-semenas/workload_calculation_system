import { useState } from 'react'
import { Box, Button, CircularProgress, Link, Tab, Tabs, Typography } from '@mui/material'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import { useNavigate, useParams } from 'react-router-dom'
import { useObject, useDeleteObject } from '../hooks/useObjects'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { EquipmentTab } from '../components/equipment/EquipmentTab'
import { RecordsTab } from '../components/records/RecordsTab'
import { RepairsTab } from '../components/repairs/RepairsTab'
import { TravelTab } from '../components/travel/TravelTab'

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

export default function ObjectDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [tabValue, setTabValue] = useState(0)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)

  const { data: object, isLoading } = useObject(id || '')
  const deleteObject = useDeleteObject()

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleDeleteConfirm = async () => {
    if (id) {
      await deleteObject.mutateAsync(id)
      navigate('/objects')
    }
  }

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
        <Link href="/divisions" underline="hover" sx={{ cursor: 'pointer', mr: 1 }}>
          Divisions
        </Link>
        <Typography component="span" sx={{ mr: 1 }}>
          &gt;
        </Typography>
        <Link href={`/divisions`} underline="hover" sx={{ cursor: 'pointer', mr: 1 }}>
          {object.divisionName}
        </Link>
        <Typography component="span" sx={{ mr: 1 }}>
          &gt;
        </Typography>
        <Link href={`/branches`} underline="hover" sx={{ cursor: 'pointer', mr: 1 }}>
          {object.branchName}
        </Link>
        <Typography component="span" sx={{ mr: 1 }}>
          &gt;
        </Typography>
        <Typography component="span">{object.name}</Typography>
      </Box>

      {/* Object Name */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          gap: 2,
        }}
      >
        <Typography variant="h4">{object.name}</Typography>
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
        <EquipmentTab objectId={id || ''} />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <RecordsTab objectId={id || ''} />
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        <RepairsTab objectId={id || ''} />
      </TabPanel>
      <TabPanel value={tabValue} index={3}>
        <TravelTab objectId={id || ''} />
      </TabPanel>
      <TabPanel value={tabValue} index={4}>
        <Typography>Available in M-03</Typography>
      </TabPanel>
      <TabPanel value={tabValue} index={5}>
        <Typography>Available in M-02</Typography>
      </TabPanel>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={openDeleteDialog}
        title="Delete object?"
        message={`Are you sure you want to delete "${object.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setOpenDeleteDialog(false)}
        confirmLabel="Delete"
      />
    </Box>
  )
}
