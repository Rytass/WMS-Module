import PageWrapper from '../../PageWrapper';
// import FilterWrapper from '../../FilterWrapper';
// import { FilterType } from '../../FilterWrapper/typing';
import StocksTable from './Table';

function Stocks() {
  return (
    <PageWrapper title="庫存清單">
      <StocksTable />
    </PageWrapper>
  );
}

export default Stocks;
