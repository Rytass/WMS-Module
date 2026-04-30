import { useState } from 'react';
import FilterWrapper from '../../../FilterWrapper';
import { FilterType } from '../../../FilterWrapper/typing';
import InventoryMovementShipTable from './Table';
import { FilterValues } from './typing';

function InventoryMovementShip() {
  const [currentFilter, setCurrentFilter] = useState<FilterValues>();

  return (
    <>
      <FilterWrapper<FilterValues>
        defaultValues={{
          material: null,
          materialDescription: '',
          batch: null,
        }}
        baseFilters={{
          filters: [
            FilterType.material,
            FilterType.materialDescription,
            FilterType.batch,
          ],
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
        }}
        onSubmit={(values) => {
          setCurrentFilter(values);
        }}
      />
      <InventoryMovementShipTable />
    </>
  );
}

export default InventoryMovementShip;
