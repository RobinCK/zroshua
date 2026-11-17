import type { ReactNode } from 'react';
import { Drawer, Modal } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

/**
 * Details of one thing (a zone, a sensor): a bottom sheet on a phone — reachable with the
 * thumb, dismissed with a swipe of the scrim — and a centred dialog on a wide screen.
 */
export function Sheet({
  opened,
  onClose,
  title,
  children,
}: {
  opened: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
}) {
  const phone = useMediaQuery('(max-width: 640px)');
  if (phone) {
    return (
      <Drawer
        opened={opened}
        onClose={onClose}
        position="bottom"
        size="auto"
        title={title}
        radius="var(--ui-radius-sheet) var(--ui-radius-sheet) 0 0"
        styles={{
          content: { borderRadius: 'var(--ui-radius-sheet) var(--ui-radius-sheet) 0 0', paddingBottom: 'var(--ui-safe-bottom)' },
          body: { paddingBottom: 20 },
        }}
      >
        {children}
      </Drawer>
    );
  }
  return (
    <Modal opened={opened} onClose={onClose} title={title} size={460}>
      {children}
    </Modal>
  );
}
