import { NextPath } from './nextpath';

export function nextDynamicPath(
  nextPath: NextPath,
  replaceDynamicPaths: { [key in string]: string },
) {
  const keys = Object.keys(replaceDynamicPaths);

  let res: string = nextPath;
  keys.forEach((key) => {
    res = res.replace(key, replaceDynamicPaths[key]);
  });

  return res;
}
