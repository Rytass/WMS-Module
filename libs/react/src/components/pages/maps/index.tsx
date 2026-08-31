import { useState } from 'react';
import { Message } from '@mezzanine-ui/react';
import { ViewMode } from '@rytass/wms-map-react-components';
import PageWrapper from '../../PageWrapper';
import MapContent from '../../map/MapContent';
import SectionWrapper from '../../SectionWrapper';
import FilterWrapper from '../../FilterWrapper';
import { FilterType } from '../../FilterWrapper/typing';
import InventoryTable from '../inventory-list/Table';
import { FilterValues } from './typing';

export interface MapsProps {
  /**
   * Whether the embedded inventory table exposes the inventory-action toolbar.
   *
   * `/maps` reads as "look at the warehouse map", but the table it embeds is a
   * full inventory write surface — hosts that gate this page on a `warehouse-map`
   * resource end up granting all 15 stock actions through it. Pass `false` to
   * make the page read-only.
   *
   * @default true
   * Kept `true` so this prop is purely additive; the default flips to `false`
   * in the next major.
   */
  readonly haveInventoryActionsSystem?: boolean;
}

function Maps({ haveInventoryActionsSystem = true }: MapsProps) {
  const [currentFilter, setCurrentFilter] = useState<FilterValues>();

  return (
    <PageWrapper title="地圖清單">
      <SectionWrapper>
        <MapContent
          viewMode={ViewMode.VIEW}
          onNodeClick={(nodeInfo, isExistingLocation) => {
            if (!isExistingLocation) {
              Message.error('不存在此位置');
            } else {
              setCurrentFilter((prev) => ({
                ...prev,
                location: {
                  id: nodeInfo.id,
                  name: nodeInfo.id,
                },
              }));
            }
          }}
        />
      </SectionWrapper>
      <FilterWrapper<FilterValues>
        defaultValues={{
          material: null,
          materialDescription: '',
          batch: null,
          location: null,
        }}
        baseFilters={{
          filters: [
            FilterType.material,
            FilterType.materialDescription,
            FilterType.batch,
          ],
          gridTemplateColumns: '1fr 1fr 1fr',
        }}
        onSubmit={(values) => {
          setCurrentFilter(values);
        }}
      />
      <InventoryTable
        currentFilter={currentFilter}
        onlyListMode
        haveInventoryActionsSystem={haveInventoryActionsSystem}
      />
    </PageWrapper>
  );
}

export default Maps;
