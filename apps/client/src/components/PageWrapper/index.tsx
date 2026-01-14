import { ReactNode } from 'react';
import { Typography } from '@mezzanine-ui/react';
import classes from './index.module.scss';

interface PageWrapperProps {
  title: string;
  children: ReactNode;
}

function PageWrapper({ title, children }: PageWrapperProps) {
  return (
    <div className={classes.host}>
      <Typography variant="h2" color="text-neutral-solid">
        {title}
      </Typography>
      {children}
    </div>
  );
}

export default PageWrapper;
