import { ReactNode } from 'react';
import { Typography, cx } from '@mezzanine-ui/react';
import classes from './index.module.scss';

interface SectionWrapperProps {
  title?: string;
  className?: string;
  children: ReactNode;
  grayBackground?: boolean;
}

function SectionWrapper({
  title,
  className,
  children,
  grayBackground = false,
}: SectionWrapperProps) {
  return (
    <div
      className={cx(classes.host, className, {
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
