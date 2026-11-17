import { useMemo, type ReactNode } from 'react';
import { MantineProvider } from '@mantine/core';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import { TOKENS, tokensToCss } from '../tokens/build';
import { createUiTheme } from './createUiTheme';
import './global.css';

const css = tokensToCss(TOKENS);

/** Mantine with the kit theme plus the --ui-* variables of both schemes. Wrap the app once. */
export function UiProvider({ children }: { children: ReactNode }) {
  const theme = useMemo(() => createUiTheme(TOKENS), []);
  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <style data-ui-tokens="">{css}</style>
      {children}
    </MantineProvider>
  );
}
