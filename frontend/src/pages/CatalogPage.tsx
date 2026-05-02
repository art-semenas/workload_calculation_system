import { useState } from 'react'
import {
  Box,
  Card,
  Grid,
  InputAdornment,
  TextField,
  Typography,
  Chip,
  CircularProgress,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { useQueries } from '@tanstack/react-query'
import { useCatalogDevices, useCatalogDeviceContexts } from '../hooks/useCatalog'
import { getCatalogDeviceContexts } from '../api/catalog'
import { tokens } from '../theme'

const SYSTEM_TONE: Record<string, { bg: string; color: string }> = {
  ОС: { bg: tokens.accentSoft, color: tokens.accentInk },
  ПС: { bg: tokens.okSoft, color: tokens.ok },
  Видео: { bg: tokens.warnSoft, color: tokens.warn },
}

function systemChipSx(systemName: string): { backgroundColor: string; color: string } {
  return SYSTEM_TONE[systemName] ?? { backgroundColor: tokens.bgSunken, color: tokens.ink3 }
}

export default function CatalogPage() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: devices = [], isLoading: devicesLoading } = useCatalogDevices()
  const { data: contexts = [], isLoading: contextsLoading } = useCatalogDeviceContexts(
    selectedDeviceId || undefined
  )

  const allContextQueries = useQueries({
    queries: devices.map((device) => ({
      queryKey: ['catalog', 'devices', device.id, 'contexts'] as const,
      queryFn: () => getCatalogDeviceContexts(device.id),
      staleTime: Number.POSITIVE_INFINITY,
    })),
  })

  const deviceSystemTags: Record<string, string[]> = {}
  for (let i = 0; i < devices.length; i++) {
    const device = devices[i]
    const query = allContextQueries[i]
    const systemNames: string[] = []
    if (query?.data && Array.isArray(query.data)) {
      const contexts = query.data as Array<{ systemType: { name: string } }>
      for (const context of contexts) {
        systemNames.push(context.systemType.name)
      }
    }
    deviceSystemTags[device.id] = systemNames
  }

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId)

  const filteredDevices = devices.filter((device) =>
    device.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (devicesLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', gap: 0, height: 'calc(100vh - 120px)' }}>
      {/* Master Rail */}
      <Box
        sx={{
          width: 380,
          display: 'flex',
          flexDirection: 'column',
          borderRight: `1px solid ${tokens.line}`,
          bg: tokens.bgElev,
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: tokens.ink3,
              mb: 2,
            }}
          >
            Device catalog
          </Typography>

          <TextField
            placeholder="Search devices..."
            aria-label="Search devices"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            variant="outlined"
            size="small"
            fullWidth
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16, color: tokens.ink4 }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Box
                    component="kbd"
                    sx={{
                      fontSize: 10,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: tokens.ink4,
                      border: `1px solid ${tokens.line}`,
                      borderRadius: 'var(--r-sm)',
                      px: '4px',
                      py: '1px',
                      lineHeight: 1.4,
                    }}
                  >
                    ⌘K
                  </Box>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: 6,
            },
            '&::-webkit-scrollbar-track': {
              bg: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              bg: tokens.ink4,
              borderRadius: 999,
            },
          }}
        >
          {filteredDevices.length === 0 ? (
            <Box sx={{ p: 2 }}>
              <Typography color="text.secondary">No devices found</Typography>
            </Box>
          ) : (
            filteredDevices.map((device) => (
              <Box
                key={device.id}
                onClick={() => setSelectedDeviceId(device.id)}
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  borderLeft: selectedDeviceId === device.id ? `2px solid ${tokens.ink}` : 'none',
                  pl: selectedDeviceId === device.id ? 'calc(2 * 1rem - 2px)' : 2,
                  backgroundColor: selectedDeviceId === device.id ? tokens.bgElev : 'transparent',
                  borderBottom: `1px solid ${tokens.line}`,
                  '&:hover': {
                    backgroundColor: tokens.bgSunken,
                  },
                }}
              >
                <Typography sx={{ fontSize: 13, fontWeight: 450, color: tokens.ink }}>
                  {device.name}
                </Typography>
                {/* System tags */}
                {(deviceSystemTags[device.id] ?? []).length > 0 && (
                  <Typography sx={{ fontSize: 11, color: tokens.ink4, mt: 0.25 }}>
                    {(deviceSystemTags[device.id] ?? []).join(', ')}
                  </Typography>
                )}
                {device.description && (
                  <Typography sx={{ fontSize: 12, color: tokens.ink4, mt: 0.5 }}>
                    {device.description}
                  </Typography>
                )}
              </Box>
            ))
          )}
        </Box>
      </Box>

      {/* Detail Panel */}
      {selectedDevice ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            p: 3,
          }}
        >
          {/* Breadcrumb */}
          <Typography
            sx={{
              fontSize: 12,
              color: tokens.ink3,
              mb: 2,
            }}
          >
            Device catalog / {selectedDevice.name}
          </Typography>

          {/* System chip(s) in detail header */}
          {contexts.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
              {[
                ...new Set(
                  contexts.map((c) => {
                    return (c.systemType as { name: string }).name
                  })
                ),
              ].map((name) => (
                <Chip
                  key={name}
                  label={name}
                  size="small"
                  variant="filled"
                  sx={systemChipSx(name)}
                />
              ))}
            </Box>
          )}

          {/* Title */}
          <Typography variant="h1" sx={{ mb: 1 }}>
            {selectedDevice.name}
          </Typography>

          {contextsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Per-system Norms */}
              {contexts.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: tokens.ink3,
                      mb: 2,
                    }}
                  >
                    Per-system norms
                  </Typography>

                  <Grid container spacing={2}>
                    {contexts.map((context) => (
                      <Grid item xs={12} sm={6} key={context.id}>
                        <Card
                          sx={{
                            p: 2,
                            border: `1px solid ${tokens.line}`,
                            backgroundColor: tokens.bgElev,
                          }}
                        >
                          <Box sx={{ mb: 2 }}>
                            <Chip
                              label={context.systemType.name as string}
                              size="small"
                              variant="filled"
                              sx={systemChipSx(context.systemType.name as string)}
                            />
                          </Box>

                          <Box sx={{ mb: 1 }}>
                            <Typography sx={{ fontSize: 12, color: tokens.ink3, mb: 0.5 }}>
                              R1
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: 24,
                                fontWeight: 500,
                                fontFamily: "'JetBrains Mono', monospace",
                              }}
                            >
                              {context.r1Minutes}
                            </Typography>
                          </Box>

                          <Box>
                            <Typography sx={{ fontSize: 12, color: tokens.ink3, mb: 0.5 }}>
                              R2
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: 24,
                                fontWeight: 500,
                                fontFamily: "'JetBrains Mono', monospace",
                              }}
                            >
                              {context.r2Minutes}
                            </Typography>
                          </Box>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </>
          )}
        </Box>
      ) : (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: tokens.ink3,
          }}
        >
          <Typography>Select a device to view details</Typography>
        </Box>
      )}
    </Box>
  )
}
