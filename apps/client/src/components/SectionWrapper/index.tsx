import { ReactNode } from 'react';
import { Typography, cx } from '@mezzanine-ui/react';
import classes from './index.module.scss';

interface SectionWrapperProps {
  title?: string;
  children: ReactNode;
  grayBackground?: boolean;
}

function SectionWrapper({
  title,
  children,
  grayBackground = false,
}: SectionWrapperProps) {
  return (
    <div
      className={cx(classes.host, {
        [classes.grayBackground]: grayBackground,
      })}
    >
      {title && (
        <Typography variant="h3" color="text-neutral-solid">
          {title}
        </Typography>
      )}
      {children}
    </div>
  );
}

export default SectionWrapper;
