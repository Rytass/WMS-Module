import { ReactNode } from 'react';
import { Typography } from '@mezzanine-ui/react';
import classes from './index.module.scss';

interface SectionWrapperProps {
  title: string;
  children: ReactNode;
}

function SectionWrapper({ title, children }: SectionWrapperProps) {
  return (
    <div className={classes.host}>
      <Typography variant="h3" color="text-neutral-solid">
        {title}
      </Typography>
      {children}
    </div>
  );
}

export default SectionWrapper;
