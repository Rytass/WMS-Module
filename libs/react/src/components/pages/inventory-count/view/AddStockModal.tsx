import { useCallback, useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { Message, SelectValue } from '@mezzanine-ui/react';
import { FormModalWrapper } from '../../../fields/FormModalWrapper';
import MaterialsField from '../../../fields/MaterialsField';
import BatchesField from '../../../fields/BatchesField';
import LocationsField from '../../../fields/LocationsField';
import AvailableLoadersField from '../../../fields/AvailableLoadersField';
import NumberInputField from '../../../fields/NumberInputField';
import { SingleSelectByIdField } from '../../../fields/SingleSelectByIdField';
import { getMaterialUnitOptions } from '../../../inventoryActions/utils';
import { BASE_UNIT } from '../../../../utils/share';
import { useInventoryCountMutations, useLazyQueryMaterial } from '../useApi';
import classes from './AddStockModal.module.scss';

interface AddStockFormValues {
  material: SelectValue<string> | null;
  batch: SelectValue<string> | null;
  location: SelectValue<string> | null;
  loader: SelectValue<string> | null;
  countedQuantity: number | string;
  /** The unit id, or `BASE_UNIT` for the material's base unit. */
  unit: string;
}

const schema: Yup.ObjectSchema<AddStockFormValues> = Yup.object({
  material: Yup.object({
    id: Yup.string().required(),
    name: Yup.string().required(),
  })
    .nullable()
    .required('必填'),
  batch: Yup.object({
    id: Yup.string().required(),
    name: Yup.string().required(),
  })
    .nullable()
    .required('必填'),
  location: Yup.object({
    id: Yup.string().required(),
    name: Yup.string().required(),
  })
    .nullable()
    .required('必填'),
  loader: Yup.object({
    id: Yup.string().required(),
    name: Yup.string().required(),
  })
    .nullable()
    .required('必填'),
  countedQuantity: Yup.mixed<number | string>()
    .test('positive', '需為大於 0 的數字', (value) => Number(value) > 0)
    .required('必填'),
  unit: Yup.string().required('必填'),
}) as Yup.ObjectSchema<AddStockFormValues>;

interface AddStockModalProps {
  orderId: string;
  open: boolean;
  closeModal: VoidFunction;
  /**
   * The id of the line just booked. The detail page uses it to clear the
   * filters, jump to the first page and highlight the new row — additions
   * already sort first server-side, so that is enough to put it on top.
   */
  onCreated?: (itemId: string) => void;
}

/**
 * "新增庫存" — book a line for stock the ledger has no record of.
 *
 * The batch field takes a *key*, not an id: the design allows editing the
 * suggested default, and a key that does not exist yet is exactly how a surplus
 * of a never-recorded batch gets onto the sheet. The backend creates it during
 * settlement.
 */
const AddStockModal: FC<AddStockModalProps> = ({
  orderId,
  open,
  closeModal,
  onCreated,
}) => {
  const { addInventoryCountItem } = useInventoryCountMutations();
  const { fetchMaterial } = useLazyQueryMaterial();

  const [unitOptions, setUnitOptions] = useState<SelectValue<string>[]>([]);

  const methods = useForm<AddStockFormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      material: null,
      batch: null,
      location: null,
      loader: null,
      countedQuantity: '',
      unit: '',
    },
  });

  const material = useWatch({
    control: methods.control,
    name: 'material',
  });
  const location = useWatch({
    control: methods.control,
    name: 'location',
  });

  /**
   * 單位 follows 料號: picking a material loads its unit list and pre-selects
   * the base unit, clearing it empties and disables the select again.
   *
   * The clear runs on *every* material change, not only on removal — switching
   * from material A to B must not leave A's units selectable (or displayed)
   * during the round-trip for B's. The field stays disabled until the new
   * options have actually arrived, which the `unitOptions.length` half of the
   * `disabled` prop below enforces.
   */
  useEffect(() => {
    setUnitOptions([]);
    methods.setValue('unit', '');
    // A leftover "必填" on a field that is now disabled would read as a dead
    // end — the operator cannot interact with it to clear the error.
    methods.clearErrors('unit');

    if (!material) return;

    (async () => {
      const { data } = await fetchMaterial({
        variables: { materialId: material.id },
      });

      // The guard against a slow response racing a newer selection: the form
      // itself knows which material is current, so a reply for anything else
      // (switched or cleared meanwhile) is simply out of date — drop it.
      if (!data?.material || data.material.id !== methods.getValues('material')?.id) {
        return;
      }

      setUnitOptions(getMaterialUnitOptions(data.material));
      methods.setValue('unit', BASE_UNIT, { shouldValidate: true });
    })();
  }, [fetchMaterial, material, methods]);

  const onSubmit = useCallback(
    async (values: AddStockFormValues) => {
      const { data } = await addInventoryCountItem({
        variables: {
          id: orderId,
          materialId: values.material?.id ?? '',
          // The batch selector carries the key in `name`; a hand-typed value
          // arrives the same way, which is what lets a new batch through.
          batchKey: values.batch?.name ?? '',
          locationId: values.location?.id ?? '',
          loaderId: values.loader?.id ?? null,
          countedQuantity: Number(values.countedQuantity),
          // `null` means the base unit — the backend stores the conversion id
          // only when the count was taken in a derived unit.
          unitId: values.unit && values.unit !== BASE_UNIT ? values.unit : null,
        },
      });

      Message.success('項目新增成功');

      const createdId = data?.addInventoryCountItem.id;

      if (createdId) onCreated?.(createdId);

      methods.reset();
      closeModal();
    },
    [addInventoryCountItem, closeModal, methods, onCreated, orderId],
  );

  return (
    <FormModalWrapper<AddStockFormValues>
      methods={methods}
      title="新增庫存"
      confirmText="新增"
      onSubmit={onSubmit}
      closeModal={closeModal}
      open={open}
      confirmMode="create"
      cancelWithConfirm={methods.formState.isDirty}
    >
      <div className={classes.host}>
        <MaterialsField name="material" label="料號" selectValueMode required />
        {/* The batch list is scoped to the chosen material, so it stays disabled
            until there is one — same order the design prescribes. */}
        <BatchesField
          name="batch"
          label="批號"
          addable
          selectValueMode
          disabled={!material}
          required
        />
        <LocationsField
          name="location"
          label="儲存位置"
          selectValueMode
          required
        />
        <AvailableLoadersField
          name="loader"
          label="載具"
          selectValueMode
          relativeLocationId={location?.id}
          disabled={!location}
          required
        />
        <NumberInputField
          name="countedQuantity"
          label="盤點數量"
          placeholder="輸入盤點數量"
          required
        />
        <SingleSelectByIdField
          name="unit"
          label="單位"
          placeholder="輸入單位"
          options={unitOptions}
          disabled={!material || !unitOptions.length}
          required
        />
      </div>
    </FormModalWrapper>
  );
};

export default AddStockModal;
