import { useState } from 'react';
import SectionWrapper from '../../../../SectionWrapper';
import InventoryTable from '../../../inventory-list/Table';
import FilterWrapper from '../../../../FilterWrapper';
import { FilterType } from '../../../../FilterWrapper/typing';
import { FilterValues } from './typing';
import classes from './index.module.scss';

const TableModal: FC = () => {
  const [currentFilter, setCurrentFilter] = useState<FilterValues>();

  return (
    <div className={classes.host}>
      <SectionWrapper grayBackground title="庫存清單">
        <FilterWrapper<FilterValues>
          defaultValues={{
            material: null,
            materialDescription: '',
            batch: null,
            location: null,
            loader: null,
          }}
          baseFilters={{
            filters: [
              FilterType.material,
              FilterType.materialDescription,
              FilterType.batch,
              FilterType.location,
              FilterType.loader,
            ],
            gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
          }}
          onSubmit={(values) => {
            setCurrentFilter(values);
          }}
          syncValues={currentFilter}
        />
      </SectionWrapper>
      <InventoryTable
        currentFilter={currentFilter}
        setCurrentFilter={setCurrentFilter}
        tableSectionClassName={classes.tableWrapper}
        haveInventoryActionsSystem={false}
      />
    </div>
  );
};

export default TableModal;
