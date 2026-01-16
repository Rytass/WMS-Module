import { ReactNode } from 'react';
import { Button } from '@mezzanine-ui/react';
import classes from './index.module.scss';

interface FormActionButtonsProps {
  onReset: VoidFunction;
  submitText: string;
  otherActionButton?: ReactNode;
}

function FormActionButtons({
  onReset,
  submitText,
  otherActionButton,
}: FormActionButtonsProps) {
  return (
    <div className={classes.host}>
      {otherActionButton}
      <div className={classes.buttons}>
        <Button
          type="button"
          size="sub"
          variant="base-secondary"
          className={classes.button}
          onClick={onReset}
        >
          重置
        </Button>
        <Button type="submit" size="sub" className={classes.button}>
          {submitText}
        </Button>
      </div>
    </div>
  );
}

export default FormActionButtons;
