import { Group, Text, ThemeIcon, Tooltip } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

/**
 * Explanation moved off the form and into a tooltip: long help text under a
 * field pushes the inputs around and makes side-by-side columns line up badly.
 * Opens on hover, on keyboard focus and on tap, so it works on a phone too.
 */
export function Hint({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip
      label={children}
      multiline
      w={280}
      withArrow
      openDelay={150}
      events={{ hover: true, focus: true, touch: true }}
    >
      <ThemeIcon variant="subtle" color="gray" size="sm" style={{ cursor: 'help' }} tabIndex={0}>
        <IconInfoCircle size={16} />
      </ThemeIcon>
    </Tooltip>
  );
}

/** A field label with its explanation behind an info icon. */
export function HintLabel({ label, hint }: { label: string; hint: React.ReactNode }) {
  return (
    <Group gap={4} wrap="nowrap" style={{ display: 'inline-flex', verticalAlign: 'middle' }}>
      <span>{label}</span>
      <Hint>{hint}</Hint>
    </Group>
  );
}

/** A section heading with its explanation behind an info icon. */
export function HintTitle({ title, hint, order = 4 }: { title: string; hint: React.ReactNode; order?: number }) {
  return (
    <Group gap={6} wrap="nowrap">
      <Text fw={700} size={order >= 4 ? 'md' : 'lg'}>
        {title}
      </Text>
      <Hint>{hint}</Hint>
    </Group>
  );
}
