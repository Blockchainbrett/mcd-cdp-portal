import { useContext, useEffect, useState } from 'react';

import { MakerObjectContext } from '../context/MakerHooksProvider';

function useMaker() {
  const maker = useContext(MakerObjectContext);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    maker.authenticate().then(() => {
      setAuthenticated(true);
    });
    return () => {
      setAuthenticated(false);
    };
  }, [maker]);

  return { maker, authenticated };
}

export default useMaker;