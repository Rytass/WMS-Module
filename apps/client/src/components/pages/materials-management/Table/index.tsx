import { useMemo, useState } from 'react';
import { TableColumn, Badge } from '@mezzanine-ui/react';
import { useDialog } from '../../../../components/dialog/useDialog';
import TableWrapper from '../../../TableWrapper';
import Table from '../../../TableWrapper/Table';
import MaterialsManagementForm from '../Form';
import Actions from './Actions';
import { SimpleMaterialFragment } from '../../../../graphql/generated/.graphql';
import { FilterValues } from '../typing';
import { useQueryMaterials } from '../useApi';

interface MaterialsManagementTableProps {
  currentFilter?: FilterValues;
}

function MaterialsManagementTable({
  currentFilter,
}: MaterialsManagementTableProps) {
  const [createModalOpened, setCreateModalOpened] = useState<boolean>(false);
  const { openDialog } = useDialog();

  const { data, loading, pageTotal, page, setPage, limit, setLimit } =
    useQueryMaterials(currentFilter);

  const dataSource = useMemo(
    (): SimpleMaterialFragment[] => data?.materials.items ?? [],
    [data?.materials.items],
  );

  const columns: TableColumn<SimpleMaterialFragment>[] = [
    {
      key: 'actions',
      title: '操作',
      width: 140,
      render: (source) => <Actions source={source} />,
    },
    {
      key: 'isActive',
      title: '狀態',
      width: 100,
      render: (source) =>
        source.isActive ? (
          <Badge variant="dot-success" text="啟用中" />
        ) : (
          <Badge variant="dot-inactive" text="已停用" />
        ),
    },
    {
      key: 'key',
      title: '料號',
      width: 160,
      render: (source) => source.key,
    },
    {
      key: 'description',
      title: '物料說明',
      width: 120,
      render: (source) => source.description,
    },
    {
      key: 'baseUnit',
      title: '基礎計量單位',
      width: 108,
      align: 'center',
      render: (source) => source.baseUnit,
    },
    {
      key: 'units',
      title: '單位轉換',
      render: (source) =>
        source.materialUnits
          ?.map((u) => `1 ${u.unit} = ${u.conversionFactor} ${source.baseUnit}`)
          .join('、'),
    },
  ];

  return (
    <>
      <TableWrapper
        title="類別項目"
        createText="新增料號"
        onCreate={() => {
          setCreateModalOpened(true);
        }}
      >
        <Table<SimpleMaterialFragment>
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          pagination={{
            current: page,
            onChange: (page) => setPage(page),
            total: pageTotal,
            pageSize: limit,
            onChangePageSize: (size) => setLimit(size),
          }}
        />
      </TableWrapper>

      <MaterialsManagementForm
        title="新增料號"
        onSubmit={async (values) => {
          const isConfirm = await openDialog({
            modalStatusType: 'info',
            title: '確認新增資料',
            supportingText:
              '您即將進入新增流程，完成後系統將自動應用相關變更。請確認是否要繼續，以便順利完成操作。',
            cancelText: '取消',
            confirmText: '確認新增',
          });

          if (isConfirm) {
            console.log('values', values);
          }
        }}
        submitText="新增"
        closeModal={() => {
          setCreateModalOpened(false);
        }}
        open={createModalOpened}
      />
    </>
  );
}

export default MaterialsManagementTable;
