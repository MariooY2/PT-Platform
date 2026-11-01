import { StatusChip } from '@/components/shared/status-chip';
import { statusLabel, statusTone, type ClientStatus } from '../lib';

/** The client's status as a word + tone chip (meaning is never carried by color alone). */
export function ClientStatusChip({ status }: { status: ClientStatus }) {
  return <StatusChip tone={statusTone(status)}>{statusLabel(status)}</StatusChip>;
}
