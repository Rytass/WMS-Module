'use client';

import {
  ReactElement,
  ReactNode,
  createContext,
  useContext,
  useMemo,
} from 'react';

export interface MapSettings {
  /**
   * Ask 「確認選擇此位置」 before a click on a map range selects it.
   *
   * On the `/maps` page a selection only filters the stock table below, and in a
   * location field it fills a value the user can change again, so a host may
   * prefer a click to select straight away. A double-click (drill down) does not
   * select: the map component holds a click for 350 ms and drops it when a
   * second click follows.
   *
   * @default true
   */
  readonly confirmSelection?: boolean;
}

const MapSettingsContext = createContext<MapSettings>({});

/**
 * Deliberately does not throw without a provider: these are preferences, and
 * the defaults keep the behaviour every existing app shell already has.
 */
export function useMapSettings(): Required<MapSettings> {
  const { confirmSelection = true } = useContext(MapSettingsContext);

  return { confirmSelection };
}

export interface MapSettingsProviderProps extends MapSettings {
  readonly children: ReactNode;
}

/**
 * Optional. Mount it above the authorized page content to set how every map in
 * the module behaves; a `confirmSelection` prop on a single map still wins.
 */
export function MapSettingsProvider({
  confirmSelection,
  children,
}: MapSettingsProviderProps): ReactElement {
  const value = useMemo(() => ({ confirmSelection }), [confirmSelection]);

  return (
    <MapSettingsContext.Provider value={value}>
      {children}
    </MapSettingsContext.Provider>
  );
}
