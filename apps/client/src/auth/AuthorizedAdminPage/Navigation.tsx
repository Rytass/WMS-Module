import { useState } from 'react';
import Image from 'next/image';
import { Navigation as MznNavigation } from '@mezzanine-ui/react';
import { LogoutIcon, SystemIcon } from '@mezzanine-ui/icons';
import {
  NavigationFooter,
  NavigationHeader,
  NavigationOption,
  NavigationUserMenu,
  NavigationIconButton,
} from '@mezzanine-ui/react/Navigation';
// eslint-disable-next-line @nx/enforce-module-boundaries
import logo from '/public/logo.jpg';
import classes from './index.module.scss';

function Navigation() {
  const [active, setActive] = useState<string[]>();

  return (
    <div className={classes.navigation}>
      <MznNavigation onOptionClick={setActive} activatedPath={active}>
        <NavigationHeader title="Rytass">
          <Image src={logo} alt="" width={36} height={36} />
        </NavigationHeader>
        <NavigationOption title="主檔管理" icon={SystemIcon}>
          <NavigationOption title="出庫單" />
          <NavigationOption title="入庫單" />
        </NavigationOption>
        <NavigationFooter>
          <NavigationUserMenu imgSrc="1">User Name</NavigationUserMenu>
          <NavigationIconButton icon={LogoutIcon} />
        </NavigationFooter>
      </MznNavigation>
    </div>
  );
}

export default Navigation;
