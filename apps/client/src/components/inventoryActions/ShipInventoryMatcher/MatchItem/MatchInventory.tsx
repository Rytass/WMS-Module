import {
  ControlFieldSlotLayout,
  FormFieldLayout,
  FormFieldLabelSpacing,
} from '@mezzanine-ui/core/form';
import { Select } from '@mezzanine-ui/react';
import FormField from '@mezzanine-ui/react/Form/FormField';
import classes from './index.module.scss';

const MatchInventory: FC = () => {
  return (
    <FormField
      name={`match-inventory`}
      severity="info"
      hintText={`可用庫存量：1,000 KG`}
      layout={FormFieldLayout.VERTICAL}
      controlFieldSlotLayout={ControlFieldSlotLayout.SUB}
      labelSpacing={FormFieldLabelSpacing.SUB}
    >
      <div className={classes.fieldWrapper}>
        <Select
          size="sub"
          mode="single"
          value={{
            id: '批號',
            name: '批號',
          }}
          options={[]}
          disabled
        />
        <Select
          size="sub"
          mode="single"
          value={{
            id: '銷售號',
            name: '銷售號',
          }}
          options={[]}
          disabled
        />
      </div>
    </FormField>
  );
};

export default MatchInventory;
