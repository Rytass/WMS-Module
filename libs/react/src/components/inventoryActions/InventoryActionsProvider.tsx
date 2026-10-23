import {
  useMemo,
  useState,
  memo,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { omit } from 'lodash';
import {
  InventoryActionItem,
  InventoryActions,
  inventoryActionOptions,
} from './utils';
import {
  DEFAULT_INVENTORY_ACTION_ERROR_MESSAGE,
  InventoryActionsContextProvider,
} from './InventoryActionsContext';
import { InventoryItem, InventorySignature, ErrorSignature } from './typing';

const isDevelopment =
  typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

export interface InventoryActionsProviderProps {
  /**
   * Allow-list: only the listed actions are enabled. Mutually exclusive with
   * {@link disabledActions} — when both are given the allow-list wins and a
   * warning is logged in development.
   */
  readonly enabledActions?: readonly InventoryActions[];
  /** Deny-list: the listed actions are disabled. */
  readonly disabledActions?: readonly InventoryActions[];
  /**
   * Escape hatch for finer-grained decisions (per current member's role, a
   * feature flag, …). Combined with the allow/deny list using AND.
   */
  readonly actionFilter?: (action: InventoryActions) => boolean;
  /**
   * Takes over failure presentation for every inventory action. When omitted
   * the lib shows the GraphQL error message through Mezzanine's `Message.error`.
   */
  readonly onError?: (action: InventoryActions, error: unknown) => void;
  /** Message used when a failure carries nothing human-readable. */
  readonly errorMessageFallback?: string;
}

const InventoryActionsProvider: FC<InventoryActionsProviderProps> = ({
  children,
  enabledActions,
  disabledActions,
  actionFilter,
  onError,
  errorMessageFallback = DEFAULT_INVENTORY_ACTION_ERROR_MESSAGE,
}) => {
  const [inventorySignature, setInventorySignature] =
    useState<InventorySignature>({});
  const [errorSignature, setErrorSignature] = useState<ErrorSignature>({});
  const [targetInventories, setTargetInventories] = useState<InventoryItem[]>(
    [],
  );
  const [targetAction, setTargetAction] = useState<InventoryActionItem | null>(
    null,
  );

  // The lists are almost always written as inline literals at the call site, so
  // depend on their contents rather than their identity — otherwise the derived
  // option list would be a new array on every render of the consumer's tree.
  const enabledKey = enabledActions?.join(',');
  const disabledKey = disabledActions?.join(',');

  const isActionEnabled = useCallback(
    (action: InventoryActions): boolean => {
      if (actionFilter && !actionFilter(action)) {
        return false;
      }

      if (enabledKey !== undefined) {
        return enabledKey.split(',').includes(action);
      }

      if (disabledKey !== undefined) {
        return !disabledKey.split(',').includes(action);
      }

      return true;
    },
    [actionFilter, disabledKey, enabledKey],
  );

  const availableActionOptions = useMemo(() => {
    if (
      isDevelopment &&
      enabledActions !== undefined &&
      disabledActions !== undefined
    ) {
      console.warn(
        '[wms-module-react] InventoryActionsProvider received both `enabledActions` and `disabledActions`. They are mutually exclusive — `enabledActions` takes precedence and `disabledActions` is ignored.',
      );
    }

    // Nothing configured is the common case: hand back the module-level array
    // untouched so behaviour is bit-for-bit what it was before this prop existed.
    if (
      !actionFilter &&
      enabledKey === undefined &&
      disabledKey === undefined
    ) {
      return inventoryActionOptions;
    }

    return inventoryActionOptions.filter((option) =>
      isActionEnabled(option.id),
    );
    // `enabledActions` / `disabledActions` are only read for the dev warning;
    // the filtering itself goes through the content-keyed `isActionEnabled`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, disabledKey, enabledKey, isActionEnabled]);

  const targetInventoryIds = useMemo(
    () => targetInventories.map((i) => i.id),
    [targetInventories],
  );

  /**
   * Disabled actions must be unreachable, not merely hidden: a deep link or a
   * stale `targetAction` left in state would otherwise mount the action's
   * drawer. Rejecting the assignment here means the drawer switch statements
   * never see a disabled action in the first place.
   */
  const setTargetActionIfEnabled = useCallback<
    Dispatch<SetStateAction<InventoryActionItem | null>>
  >(
    (value) => {
      setTargetAction((previousAction) => {
        const nextAction =
          typeof value === 'function' ? value(previousAction) : value;

        if (nextAction && !isActionEnabled(nextAction.id)) {
          if (isDevelopment) {
            console.warn(
              `[wms-module-react] Inventory action "${nextAction.id}" is disabled for this deployment and was not activated.`,
            );
          }

          return previousAction;
        }

        return nextAction;
      });
    },
    [isActionEnabled],
  );

  const pushTargetInventories = useCallback((inventories: InventoryItem[]) => {
    setTargetInventories((prevInventories) => [
      ...prevInventories,
      ...inventories,
    ]);

    const currentSignature = inventories.reduce(
      (prev, curr) => ({
        ...prev,
        [curr.id]: {
          id: curr.id,
          quantity: curr.maxQuantityByDefaultUnit,
          unitId: null,
        },
      }),
      {},
    );
    setInventorySignature((prevSignature) => ({
      ...prevSignature,
      ...currentSignature,
    }));
  }, []);

  const updateInventoryQuantity = useCallback(
    (id: string, quantity: number) => {
      setInventorySignature((prevSignature) => ({
        ...prevSignature,
        [id]: {
          ...prevSignature[id],
          quantity,
        },
      }));
    },
    [],
  );

  const updateInventoryUnitId = useCallback(
    (id: string, unitId: string | null) => {
      setInventorySignature((prevSignature) => ({
        ...prevSignature,
        [id]: {
          ...prevSignature[id],
          unitId,
        },
      }));
    },
    [],
  );

  const removeTargetInventory = useCallback((id: string) => {
    setTargetInventories((prevInventories) => {
      const targetIndex = prevInventories.findIndex((i) => i.id === id);

      return [
        ...prevInventories.slice(0, targetIndex),
        ...prevInventories.slice(targetIndex + 1),
      ];
    });

    setInventorySignature((prevSignature) => omit(prevSignature, id));
    setErrorSignature((prevSignature) => omit(prevSignature, id));
  }, []);

  const updateErrorSignature = useCallback(
    (id: string, errorMessage: string) => {
      setErrorSignature((prevSignature) => ({
        ...prevSignature,
        [id]: errorMessage,
      }));
    },
    [],
  );

  const removeErrorSignature = useCallback((id: string) => {
    setErrorSignature((prevSignature) => omit(prevSignature, id));
  }, []);

  const removeInventoryByIds = useCallback((ids: string[]) => {
    setInventorySignature((prevSignature) => omit(prevSignature, ids));
    setErrorSignature((prevSignature) => omit(prevSignature, ids));
    setTargetInventories((prevInventories) =>
      prevInventories.filter((i) => !ids.includes(i.id)),
    );
  }, []);

  const resetAll = useCallback(() => {
    setInventorySignature({});
    setErrorSignature({});
    setTargetInventories([]);
    setTargetAction(null);
  }, []);

  return (
    <InventoryActionsContextProvider
      value={{
        inventorySignature,
        targetInventories,
        targetInventoryIds,
        pushTargetInventories,
        updateInventoryQuantity,
        updateInventoryUnitId,
        removeTargetInventory,
        removeInventoryByIds,
        resetAll,
        targetAction,
        setTargetAction: setTargetActionIfEnabled,
        errorSignature,
        updateErrorSignature,
        removeErrorSignature,
        availableActionOptions,
        isActionEnabled,
        onError,
        errorMessageFallback,
      }}
    >
      {children}
    </InventoryActionsContextProvider>
  );
};

export default memo(InventoryActionsProvider);
