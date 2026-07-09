import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  MantineProvider,
  Modal,
  NavLink,
  Paper,
  Progress,
  Tooltip,
  createTheme,
} from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/charts/styles.css';
import '@mantine/notifications/styles.css';
import './styles.css';
import App from './App';

const theme = createTheme({
  primaryColor: 'teal',
  primaryShade: { light: 7, dark: 6 },
  defaultRadius: 'md',
  cursorType: 'pointer',
  headings: { fontWeight: '650' },
  components: {
    Card: Card.extend({ defaultProps: { radius: 'lg', withBorder: true, shadow: 'xs' } }),
    Paper: Paper.extend({ defaultProps: { radius: 'lg' } }),
    Modal: Modal.extend({
      defaultProps: {
        radius: 'lg',
        centered: true,
        overlayProps: { backgroundOpacity: 0.45, blur: 3 },
      },
    }),
    Button: Button.extend({ defaultProps: { radius: 'md' } }),
    ActionIcon: ActionIcon.extend({ defaultProps: { radius: 'md' } }),
    Badge: Badge.extend({ defaultProps: { radius: 'sm' } }),
    Progress: Progress.extend({ defaultProps: { radius: 'xl' } }),
    Tooltip: Tooltip.extend({ defaultProps: { radius: 'md' } }),
    NavLink: NavLink.extend({
      styles: { root: { borderRadius: 'var(--mantine-radius-md)' }, label: { fontWeight: 500 } },
    }),
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications position="top-right" />
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
