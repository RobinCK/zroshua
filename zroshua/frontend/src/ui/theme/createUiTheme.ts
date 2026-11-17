import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Checkbox,
  Drawer,
  Menu,
  Modal,
  NumberInput,
  Paper,
  Popover,
  SegmentedControl,
  Select,
  Switch,
  TextInput,
  Tooltip,
  createTheme,
  virtualColor,
  type MantineColorsTuple,
  type MantineThemeOverride,
} from '@mantine/core';
import type { BaseTone } from '../tokens/base';
import { TOKENS, type ThemeTokens } from '../tokens/build';
import { ramp } from '../tokens/color';

const tuple = (shades: string[]) => shades as unknown as MantineColorsTuple;

/**
 * Mantine's own colour names, pointed at the tones. Editors and forms still say
 * `color="red"` or `color="teal"`; with this map they paint the kit's err and ok
 * instead of Mantine's palette, so a redesign of the tokens reaches them too.
 */
const MANTINE_NAMES: Record<string, BaseTone | 'neutral'> = {
  red: 'err',
  orange: 'warn',
  yellow: 'warn',
  teal: 'ok',
  green: 'ok',
  blue: 'water',
  cyan: 'water',
  grape: 'event',
  violet: 'event',
  indigo: 'event',
  gray: 'neutral',
  dark: 'neutral',
};

/**
 * Mantine theme from the tokens. The primary colour is a neutral ramp built from the action
 * colour (light ink on dark, dark ink on light), never a tone: a tone means a state.
 */
export function createUiTheme(tokens: ThemeTokens = TOKENS): MantineThemeOverride {
  const r = tokens.radii;
  const colors: Record<string, MantineColorsTuple> = {
    neutralDark: tuple(ramp(tokens.dark.action.bg)),
    neutralLight: tuple(ramp(tokens.light.action.bg)),
  };
  const tones: BaseTone[] = ['water', 'event', 'ok', 'warn', 'err'];
  for (const tone of tones) {
    colors[`${tone}Dark`] = tuple(ramp(tokens.dark.tones[tone].line));
    colors[`${tone}Light`] = tuple(ramp(tokens.light.tones[tone].line));
  }
  const virtual: Record<string, MantineColorsTuple> = {};
  for (const name of ['neutral', ...tones]) {
    virtual[name] = virtualColor({ name, dark: `${name}Dark`, light: `${name}Light` });
  }
  for (const [name, target] of Object.entries(MANTINE_NAMES)) {
    if (name === 'dark') continue;
    virtual[name] = virtualColor({ name, dark: `${target}Dark`, light: `${target}Light` });
  }

  return createTheme({
    colors: { ...colors, ...virtual },
    primaryColor: 'neutral',
    primaryShade: 6,
    autoContrast: true,
    luminanceThreshold: 0.45,
    white: '#FFFFFF',
    black: tokens.light.neutrals.text1,
    fontFamily: tokens.fonts.sans,
    fontFamilyMonospace: tokens.fonts.mono,
    headings: { fontFamily: tokens.fonts.sans, fontWeight: '600' },
    defaultRadius: 'md',
    radius: { xs: `${r.xs}px`, sm: `${r.sm}px`, md: `${r.md}px`, lg: `${r.lg}px`, xl: `${r.card}px` },
    spacing: { xs: '8px', sm: '12px', md: '16px', lg: '20px', xl: '24px' },
    fontSizes: { xs: '12px', sm: '13px', md: '14px', lg: '15px', xl: '17px' },
    lineHeights: { xs: '1.4', sm: '1.45', md: '1.45', lg: '1.45', xl: '1.4' },
    cursorType: 'pointer',
    focusRing: 'auto',
    respectReducedMotion: true,
    components: {
      Card: Card.extend({ defaultProps: { radius: r.card, withBorder: true } }),
      Paper: Paper.extend({ defaultProps: { radius: r.card } }),
      Modal: Modal.extend({
        defaultProps: { radius: r.card, centered: true, overlayProps: { backgroundOpacity: 0.62, blur: 3 } },
      }),
      Drawer: Drawer.extend({ defaultProps: { overlayProps: { backgroundOpacity: 0.62, blur: 3 } } }),
      Button: Button.extend({ defaultProps: { radius: r.md } }),
      ActionIcon: ActionIcon.extend({ defaultProps: { radius: r.md } }),
      SegmentedControl: SegmentedControl.extend({ defaultProps: { radius: r.md } }),
      Tooltip: Tooltip.extend({ defaultProps: { radius: r.md, withArrow: true } }),
      Badge: Badge.extend({ defaultProps: { radius: r.pill } }),
      Popover: Popover.extend({ defaultProps: { radius: r.lg, shadow: 'md' } }),
      Menu: Menu.extend({ defaultProps: { radius: r.lg, shadow: 'md' } }),
      Select: Select.extend({ defaultProps: { radius: r.md } }),
      NumberInput: NumberInput.extend({ defaultProps: { radius: r.md } }),
      TextInput: TextInput.extend({ defaultProps: { radius: r.md } }),
      Checkbox: Checkbox.extend({ defaultProps: { color: 'neutral' } }),
      Switch: Switch.extend({ defaultProps: { color: 'teal' } }),
    },
  });
}
