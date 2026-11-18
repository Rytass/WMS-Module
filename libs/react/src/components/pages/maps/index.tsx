import { useState } from 'react';
import { Message } from '@mezzanine-ui/react';
import { ViewMode } from '@rytass/wms-map-react-components';
import PageWrapper from '../../PageWrapper';
import MapContent from '../../map/MapContent';
import { useMapSettings } from '../../map/settings';
import SectionWrapper from '../../SectionWrapper';
import FilterWrapper from '../../FilterWrapper';
import InputField from '../../fields/InputField';
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
  /**
   * Ask before a click on the map filters the table. Overrides
   * `MapSettingsProvider`; see `MapSettings.confirmSelection`.
   */
  readonly confirmMapSelection?: boolean;
  /**
   * CSS height of the map above the table. The table is what the page is for,
   * so the map gets enough to pick from and no more.
   *
   * @default '40vh'
   */
  readonly mapHeight?: string;
}

function Maps({
  haveInventoryActionsSystem = true,
  confirmMapSelection,
  mapHeight = '40vh',
}: MapsProps) {
  const [currentFilter, setCurrentFilter] = useState<FilterValues>();
  const settings = useMapSettings();
  const confirmSelection = confirmMapSelection ?? settings.confirmSelection;

  return (
    <PageWrapper title="地圖清單">
      <SectionWrapper>
        <MapContent
          viewMode={ViewMode.VIEW}
          confirmSelection={confirmSelection}
          selectedLocationKey={currentFilter?.location?.id}
          height={mapHeight}
          onNodeClick={(nodeInfo, isExistingLocation) => {
            if (!isExistingLocation) {
              Message.error('不存在此位置');
            } else if (currentFilter?.location?.id === nodeInfo.id) {
              // A second click on the selected range is the way back out.
              setCurrentFilter((prev) => ({ ...prev, location: null }));
              Message.info(`已取消篩選庫位 ${nodeInfo.id}`);
            } else {
              setCurrentFilter((prev) => ({
                ...prev,
                location: {
                  id: nodeInfo.id,
                  name: nodeInfo.id,
                },
              }));

              // Without the dialog the only sign of a click is a table that may
              // be scrolled out of view.
              if (!confirmSelection)
                Message.success(`已篩選庫位 ${nodeInfo.id}`);
            }
          }}
        />
      </SectionWrapper>
      <FilterWrapper<FilterValues>
        haveAdvancedFilters
        defaultValues={{
          material: null,
          materialDescription: '',
          batch: null,
          location: null,
          vendorId: '',
          customerId: '',
          saleId: '',
          saleSerialId: '',
        }}
        baseFilters={{
          filters: [
            FilterType.material,
            FilterType.materialDescription,
            FilterType.batch,
          ],
          gridTemplateColumns: '1fr 1fr 1fr',
        }}
        expandedFilters1={{
          filters: [
            <InputField
              key="vendorId"
              name="vendorId"
              label="供應商"
              placeholder="輸入供應商"
            />,
            <InputField
              key="customerId"
              name="customerId"
              label="客戶"
              placeholder="輸入客戶"
            />,
            <InputField
              key="saleId"
              name="saleId"
              label="銷售訂單號碼"
              placeholder="輸入銷售訂單號碼"
            />,
            <InputField
              key="saleSerialId"
              name="saleSerialId"
              label="銷售訂單項次"
              placeholder="輸入銷售訂單項次"
            />,
          ],
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
        }}
        onSubmit={(values) => {
          // The map's node click writes `location` straight into the filter;
          // replacing the whole object here would throw that away, so the
          // submitted values are merged over it instead.
          setCurrentFilter((previous) => ({ ...previous, ...values }));
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
