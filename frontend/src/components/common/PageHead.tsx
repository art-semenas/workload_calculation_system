import { Box, Breadcrumbs, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import { tokens } from '../../theme'

interface PageHeadCrumb {
  label: string
  to?: string
}

interface PageHeadProps {
  crumbs: PageHeadCrumb[]
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function PageHead({ crumbs, title, subtitle, actions }: PageHeadProps) {
  return (
    <Box sx={{ marginBottom: 'var(--gap-xl)' }}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        separator="/"
        sx={{
          marginBottom: 'var(--gap-m)',
          '& .MuiBreadcrumbs-separator': {
            color: tokens.ink4,
          },
        }}
      >
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1
          return crumb.to ? (
            <Link key={idx} to={crumb.to} style={{ textDecoration: 'none' }}>
              <Typography
                sx={{
                  color: tokens.ink4,
                  fontSize: 14,
                  fontWeight: 450,
                  '&:hover': { color: tokens.ink3 },
                }}
              >
                {crumb.label}
              </Typography>
            </Link>
          ) : (
            <Typography
              key={idx}
              sx={{
                color: isLast ? tokens.ink : tokens.ink4,
                fontSize: 14,
                fontWeight: 450,
              }}
            >
              {crumb.label}
            </Typography>
          )
        })}
      </Breadcrumbs>

      {/* Title + Actions Row */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 'var(--gap-m)',
          marginBottom: subtitle ? 'var(--gap-s)' : 0,
        }}
      >
        <h1
          style={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            margin: 0,
            color: tokens.ink,
          }}
        >
          {title}
        </h1>
        {actions && <Box>{actions}</Box>}
      </Box>

      {/* Subtitle */}
      {subtitle && (
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 450,
            color: tokens.ink3,
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  )
}
