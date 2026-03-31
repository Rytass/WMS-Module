import TableWrapper from '../../../TableWrapper';
import Table from '../../../TableWrapper/Table';

function InventoryCountTable() {
  return (
    <TableWrapper
      title="盤點項目"
      createText="建立盤點"
      onCreate={() => {
        //
      }}
    >
      <Table
        columns={[]}
        dataSource={[]}
        // loading={loading}
        // pagination={{
        //   current: page,
        //   onChange: (page) => setPage(page),
        //   total: pageTotal,
        //   pageSize: limit,
        //   onChangePageSize: (size) => setLimit(size),
        // }}
      />
    </TableWrapper>
  );
}

export default InventoryCountTable;
