import {
  ControlFieldSlotLayout,
  FormFieldLayout,
  FormFieldLabelSpacing,
} from '@mezzanine-ui/core/form';
import { Input } from '@mezzanine-ui/react';
import FormField from '@mezzanine-ui/react/Form/FormField';

const LabelInput: FC = () => {
  return (
    <FormField
      label="標籤掃碼"
      name="label-input"
      layout={FormFieldLayout.HORIZONTAL}
      labelSpacing={FormFieldLabelSpacing.MAIN}
      controlFieldSlotLayout={ControlFieldSlotLayout.MAIN}
    >
      <Input fullWidth clearable variant="base" placeholder="請掃描標籤條碼" />
    </FormField>
  );
};

export default LabelInput;
