import { useState } from 'react';
import { Navigation as MznNavigation } from '@mezzanine-ui/react';

function Navigation() {
  const [active, setActive] = useState<string[]>();

  return (
    <MznNavigation
      onOptionClick={setActive}
      activatedPath={active}
      collapsed
    ></MznNavigation>
  );
}

export default Navigation;
