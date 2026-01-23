import PageWrapper from '../../PageWrapper';
// import FilterWrapper from '../../FilterWrapper';
// import { FilterType } from '../../FilterWrapper/typing';
import InventoryTable from './Table';

function Inventory() {
  return (
    <PageWrapper title="庫存清單">
      <InventoryTable />
    </PageWrapper>
  );
}

export default Inventory;
