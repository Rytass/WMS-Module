import { useState } from 'react';
import FilterWrapper from '../../../FilterWrapper';
import { FilterType } from '../../../FilterWrapper/typing';
import InventoryMovementTransferTable from './Table';
import TransferOrdersField from '../../../fields/TransferOrdersField';
import LocationsField from '../../../fields/LocationsField';
import LoadersField from '../../../fields/LoadersField';
import { FilterValues } from './typing';

function InventoryMovementTransfer() {
  const [currentFilter, setCurrentFilter] = useState<FilterValues>();

  console.log('currentFilter', currentFilter);

  return (
    <>
      <FilterWrapper<FilterValues>
        defaultValues={{
          transferOrder: null,
          material: null,
          materialDescription: '',
          batch: null,
          targetLocation: null,
          targetLoader: null,
          sourceLocation: null,
          sourceLoader: null,
        }}
        baseFilters={{
          filters: [
            <TransferOrdersField
              key="transferOrder"
              name="transferOrder"
              selectValueMode
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
              key="targetLocation"
              name="targetLocation"
              label="目標位置"
              selectValueMode
              useMpaButton
            />,
            <LoadersField
              key="targetLoader"
              name="targetLoader"
              label="目標載具"
              selectValueMode
            />,
            <LocationsField
              key="sourceLocation"
              name="sourceLocation"
              label="來源位置"
              selectValueMode
              useMpaButton
            />,
            <LoadersField
              key="sourceLoader"
              name="sourceLoader"
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
      <InventoryMovementTransferTable currentFilter={currentFilter} />
    </>
  );
}

export default InventoryMovementTransfer;
