/* eslint-disable @typescript-eslint/no-explicit-any */
declare module '*.svg' {
  const content: any;
  export const ReactComponent: any;
  export default content;
}

declare module '*.scss';

type FC<Props = unknown> = React.FunctionComponent<
  Props & { children?: ReactNode }
>;
