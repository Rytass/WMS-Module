import { useState } from 'react';
import TableWrapper from '../../../TableWrapper';
import Table from '../../../TableWrapper/Table';
import CreateInventoryCountForm from '../CreateForm';

function InventoryCountTable() {
  const [createModalOpened, setCreateModalOpened] = useState<boolean>(false);

  return (
    <>
      <TableWrapper
        title="盤點項目"
        createText="建立盤點"
        onCreate={() => {
          setCreateModalOpened(true);
        }}
      >
        <Table
          tableKey="InventoryCount"
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
      <CreateInventoryCountForm
        closeModal={() => {
          setCreateModalOpened(false);
        }}
        open={createModalOpened}
      />
    </>
  );
}

export default InventoryCountTable;
