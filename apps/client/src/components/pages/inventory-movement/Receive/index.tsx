import { useState } from 'react';
import FilterWrapper from '../../../FilterWrapper';
import { FilterType } from '../../../FilterWrapper/typing';
import InventoryMovementReceiveTable from './Table';
import ReceiveInventoryOrdersField from '../../../fields/ReceiveInventoryOrdersField';
import LocationsField from '../../../fields/LocationsField';
import LoadersField from '../../../fields/LoadersField';
import { FilterValues } from './typing';

function InventoryMovementReceive() {
  const [currentFilter, setCurrentFilter] = useState<FilterValues>();

  console.log('currentFilter', currentFilter);

  return (
    <>
      <FilterWrapper<FilterValues>
        defaultValues={{
          receiveOrder: null,
          material: null,
          materialDescription: '',
          batch: null,
          location: null,
          loader: null,
        }}
        baseFilters={{
          filters: [
            <ReceiveInventoryOrdersField
              key="receiveOrder"
              name="receiveOrder"
              selectValueMode
              fetchOnlyPending
            />,
            FilterType.material,
            FilterType.materialDescription,
            FilterType.batch,
          ],
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
        }}
        expandedFilters1={{
          filters: [
            <LocationsField
              key="location"
              name="location"
              label="目標位置"
              selectValueMode
              useMpaButton
            />,
            <LoadersField
              key="loader"
              name="loader"
              label="目標載具"
              selectValueMode
            />,
          ],
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
        }}
        haveAdvancedFilters
        onSubmit={(values) => {
          setCurrentFilter(values);
        }}
      />
      <InventoryMovementReceiveTable currentFilter={currentFilter} />
    </>
  );
}

export default InventoryMovementReceive;
