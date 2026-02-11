import { Spin } from '@mezzanine-ui/react';
import classes from './index.module.scss';

const Loading: FC = () => {
  return (
    <div className={classes.host}>
      <Spin size="sub" loading />
    </div>
  );
};

export default Loading;
