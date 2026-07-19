// Providers the preview cards render inside so every card matches the real app.
// Bundled into _ds_bundle.js via cfg.extraEntries → the previews share the SAME
// @mui and react-router-dom instances as the components. A preview-local copy of
// either would be a second instance with a mismatched React context.
//
// - MuiThemeProvider + dsTheme: the app applies Inter, the ink palette, and all
//   MUI component overrides through this theme. Without it, MUI Typography/Button
//   fall back to Roboto and default styling — off-brand. dsTheme is the app's own
//   configured theme object.
// - PreviewRouter: PageHead renders react-router <Link> breadcrumbs that throw
//   ("useHref may be used only in the context of a Router") outside a Router.
//   Harmless around the 7 components that don't route.
export { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
export { theme as dsTheme } from '../frontend/src/theme'
export { MemoryRouter as PreviewRouter } from 'react-router-dom'
