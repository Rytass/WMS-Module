import { LockIcon, UnlockIcon, LinkIcon, TrashIcon } from '@mezzanine-ui/icons';
import { SplitIcon, MergeIcon, UnlinkIcon } from '../icons';
import { DropdownOption } from '@mezzanine-ui/react';
import { StockStatus } from '../graphql/generated/.graphql';

export enum InventoryActions {
  HoldInventory = 'HoldInventory',
  ReleaseInventoryHold = 'ReleaseInventoryHold',
  AllocateInventory = 'AllocateInventory',
  DeallocateInventory = 'DeallocateInventory',
  SplitBatch = 'SplitBatch',
  MergeBatch = 'MergeBatch',
  ScrapInventory = 'ScrapInventory',
}

export type InventoryActionItem = DropdownOption & {
  status: StockStatus[];
};

export function inventoryActionsSpec(
  action: InventoryActions,
): InventoryActionItem | null {
  switch (action) {
    case InventoryActions.HoldInventory:
      return {
        id: action,
        name: '凍結',
        icon: LockIcon,
        status: [],
      };

    case InventoryActions.ReleaseInventoryHold:
      return {
        id: action,
        name: '解除凍結',
        icon: UnlockIcon,
        status: [],
      };

    case InventoryActions.AllocateInventory:
      return {
        id: action,
        name: '綁定銷售訂單',
        icon: LinkIcon,
        status: [],
      };

    case InventoryActions.DeallocateInventory:
      return {
        id: action,
        name: '解除綁定銷售訂單',
        icon: UnlinkIcon,
        status: [],
      };

    case InventoryActions.SplitBatch:
      return {
        id: action,
        name: '拆分批號',
        icon: SplitIcon,
        status: [],
      };

    case InventoryActions.MergeBatch:
      return {
        id: action,
        name: '合併批號',
        icon: MergeIcon,
        status: [],
      };

    case InventoryActions.ScrapInventory:
      return {
        id: action,
        name: '報廢',
        icon: TrashIcon,
        validate: 'danger',
        status: [],
      };

    default:
      return null;
  }
}

export const inventoryActionOptions: InventoryActionItem[] = [
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
  status: inventoryActionsSpec(action)?.status ?? [],
}));
