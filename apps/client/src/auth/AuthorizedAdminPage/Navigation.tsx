import { useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Navigation as MznNavigation } from '@mezzanine-ui/react';
import { LogoutIcon } from '@mezzanine-ui/icons';
import {
  NavigationFooter,
  NavigationHeader,
  NavigationOption,
  NavigationUserMenu,
  NavigationIconButton,
  NavigationChild,
} from '@mezzanine-ui/react/Navigation';
import { useRoutes } from '@rytass/wms-module-react';
// eslint-disable-next-line @nx/enforce-module-boundaries
import logo from '/public/logo.jpg';
import classes from './index.module.scss';

function Navigation() {
  const { pathname, push } = useRouter();
  const routes = useRoutes();

  const renderOptions = useCallback(
    (): NavigationChild => (
      <>
        {routes.map((route) => {
          if (route.children) {
            return (
              <NavigationOption
                key={route.title}
                title={route.title}
                icon={route.icon}
                active={route.children.some((subRoute) =>
                  pathname.startsWith(subRoute.href),
                )}
              >
                {route.children.map((subRoute) => (
                  <NavigationOption
                    key={subRoute.href}
                    title={subRoute.title}
                    active={pathname.startsWith(subRoute.href)}
                    onTriggerClick={() => {
                      push(subRoute.href);
                    }}
                  />
                ))}
              </NavigationOption>
            );
          }

          return (
            <NavigationOption
              key={route.title}
              title={route.title}
              icon={route.icon}
              active={pathname.startsWith(route.href)}
              onTriggerClick={() => {
                push(route.href);
              }}
            />
          );
        })}
      </>
    ),
    [pathname, push, routes],
  );

  return (
    <div className={classes.navigation}>
      <MznNavigation>
        <NavigationHeader title="Rytass">
          <Image src={logo} alt="" width={28} height={28} />
        </NavigationHeader>
        {renderOptions()}
        <NavigationFooter>
          <NavigationUserMenu imgSrc="1" options={[]}>
            User Name
          </NavigationUserMenu>
          <NavigationIconButton icon={LogoutIcon} />
        </NavigationFooter>
      </MznNavigation>
    </div>
  );
}

export default Navigation;
