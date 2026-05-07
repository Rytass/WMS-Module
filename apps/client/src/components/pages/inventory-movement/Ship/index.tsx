import { useState } from 'react';
import FilterWrapper from '../../../FilterWrapper';
import { FilterType } from '../../../FilterWrapper/typing';
import InventoryMovementShipTable from './Table';
import ShipInventoryOrdersField from '../../../fields/ShipInventoryOrdersField';
import LocationsField from '../../../fields/LocationsField';
import LoadersField from '../../../fields/LoadersField';
import { FilterValues } from './typing';

function InventoryMovementShip() {
  const [currentFilter, setCurrentFilter] = useState<FilterValues>();

  console.log('currentFilter', currentFilter);

  return (
    <>
      <FilterWrapper<FilterValues>
        defaultValues={{
          shipOrder: null,
          material: null,
          materialDescription: '',
          batch: null,
          location: null,
          loader: null,
        }}
        baseFilters={{
          filters: [
            <ShipInventoryOrdersField
              key="shipOrder"
              name="shipOrder"
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
              label="來源位置"
              selectValueMode
              useMpaButton
            />,
            <LoadersField
              key="loader"
              name="loader"
              label="來源載具"
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
      <InventoryMovementShipTable currentFilter={currentFilter} />
    </>
  );
}

export default InventoryMovementShip;
