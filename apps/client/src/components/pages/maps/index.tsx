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

function Maps() {
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
      <InventoryTable currentFilter={currentFilter} onlyListMode />
    </PageWrapper>
  );
}

export default Maps;
