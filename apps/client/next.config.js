//@ts-check

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { composePlugins, withNx } = require('@nx/next');

const API_URL = process.env.API_URL ?? 'http://localhost:7103';

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {},
  poweredByHeader: false,
  rewrites: async () => [
    {
      source: '/graphql',
      destination: `${API_URL}/graphql`,
    },
  ],
  transpilePackages: [
    '@mezzanine-ui/core',
    '@mezzanine-ui/system',
    '@mezzanine-ui/react',
    '@mezzanine-ui/icons',
  ],
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
