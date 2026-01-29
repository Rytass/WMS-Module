import { LockIcon, UnlockIcon, LinkIcon, TrashIcon } from '@mezzanine-ui/icons';
import { SplitIcon, MergeIcon, UnlinkIcon } from '../icons';
import { DropdownOption } from '@mezzanine-ui/react';

export enum InventoryActions {
  HoldInventory = 'HoldInventory',
  ReleaseInventoryHold = 'ReleaseInventoryHold',
  AllocateInventory = 'AllocateInventory',
  DeallocateInventory = 'DeallocateInventory',
  SplitBatch = 'SplitBatch',
  MergeBatch = 'MergeBatch',
  ScrapInventory = 'ScrapInventory',
}

export function inventoryActionsSpec(
  action: InventoryActions,
): Omit<DropdownOption, 'id'> | null {
  switch (action) {
    case InventoryActions.HoldInventory:
      return {
        name: '凍結',
        icon: LockIcon,
      };

    case InventoryActions.ReleaseInventoryHold:
      return {
        name: '解除凍結',
        icon: UnlockIcon,
      };

    case InventoryActions.AllocateInventory:
      return {
        name: '綁定銷售訂單',
        icon: LinkIcon,
      };

    case InventoryActions.DeallocateInventory:
      return {
        name: '解除綁定銷售訂單',
        icon: UnlinkIcon,
      };

    case InventoryActions.SplitBatch:
      return {
        name: '拆分批號',
        icon: SplitIcon,
      };

    case InventoryActions.MergeBatch:
      return {
        name: '合併批號',
        icon: MergeIcon,
      };

    case InventoryActions.ScrapInventory:
      return {
        name: '報廢',
        icon: TrashIcon,
        validate: 'danger',
      };

    default:
      return null;
  }
}

export const inventoryActionOptions: DropdownOption[] = [
  InventoryActions.HoldInventory,
  InventoryActions.ReleaseInventoryHold,
  InventoryActions.AllocateInventory,
  InventoryActions.DeallocateInventory,
  InventoryActions.SplitBatch,
  InventoryActions.MergeBatch,
  InventoryActions.ScrapInventory,
].map((action) => ({
  id: action,
  name: inventoryActionsSpec(action)?.name ?? '',
  icon: inventoryActionsSpec(action)?.icon,
  validate: inventoryActionsSpec(action)?.validate,
}));
