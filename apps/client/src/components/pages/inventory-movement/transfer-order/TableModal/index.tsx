import SectionWrapper from '../../../../SectionWrapper';
import InventoryTable from '../../../inventory-list/Table';
import classes from './index.module.scss';

const TableModal: FC = () => {
  return (
    <div className={classes.host}>
      <SectionWrapper grayBackground title="庫存清單">
        filters
      </SectionWrapper>
      <InventoryTable
        tableSectionClassName={classes.tableWrapper}
        haveInventoryActionsSystem={false}
      />
    </div>
  );
};

export default TableModal;
