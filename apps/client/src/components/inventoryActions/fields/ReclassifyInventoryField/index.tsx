import { useCallback, useEffect } from 'react';
import { useWatch, useFormContext } from 'react-hook-form';
import MaterialsField from '../../../fields/MaterialsField';
import InputField from '../../../fields/InputField';
import { useLazyQueryMaterial } from './useApi';
import { ReclassifyInventoryFieldValues } from './typing';
import classes from './index.module.scss';

function ReclassifyInventoryField() {
  const { fetchMaterial } = useLazyQueryMaterial();
  const materialValue = useWatch<ReclassifyInventoryFieldValues, 'material'>({
    name: 'material',
  });
  const { setValue } = useFormContext<ReclassifyInventoryFieldValues>();

  const doFetchMaterial = useCallback(async () => {
    const { data } = await fetchMaterial({
      variables: {
        key: materialValue?.name,
      },
    });

    if (data?.material.id) {
      const material = data.material;

      setValue('description', material.description || '');
    }
  }, [fetchMaterial, materialValue?.name, setValue]);

  useEffect(() => {
    if (materialValue) {
      doFetchMaterial();
    } else {
      setValue('description', '');
    }
  }, [doFetchMaterial, materialValue, setValue]);

  return (
    <div className={classes.host}>
      <div className={classes.selectorsWrapper}>
        <MaterialsField
          name="material"
          label="新料號"
          fuzzySearch={false}
          selectValueMode
          required
        />
        <InputField name="description" label="物料說明" disabled />
      </div>
    </div>
  );
}

export default ReclassifyInventoryField;
