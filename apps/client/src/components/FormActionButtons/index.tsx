import { ReactNode } from 'react';
import { Button, cx } from '@mezzanine-ui/react';
import classes from './index.module.scss';

interface FormActionButtonsProps {
  onReset: VoidFunction;
  submitText: string;
  submitButtonType?: 'submit' | 'button';
  onClickSubmit?: VoidFunction;
  otherActionButton?: ReactNode;
}

function FormActionButtons({
  onReset,
  submitText,
  submitButtonType = 'submit',
  onClickSubmit,
  otherActionButton,
}: FormActionButtonsProps) {
  return (
    <div
      className={cx(classes.host, {
        [classes.haveOtherButton]: !!otherActionButton,
      })}
    >
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
        <Button
          type={submitButtonType}
          size="sub"
          className={classes.button}
          onClick={onClickSubmit}
        >
          {submitText}
        </Button>
      </div>
    </div>
  );
}

export default FormActionButtons;
