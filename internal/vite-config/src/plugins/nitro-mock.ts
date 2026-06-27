import type { PluginOption } from 'vite';

import type { NitroMockPluginOptions } from '../typing';

import { colors, consola, getPackage } from '@vben/node-utils';

import getPort from 'get-port';
import { build, createDevServer, createNitro, prepare } from 'nitropack';

const hmrKeyRe = /^runtimeConfig\.|routeRules\./;

export const viteNitroMockPlugin = ({
  mockServerPackage = '@vben/backend-mock',
  port = 5320,
  verbose = true,
}: NitroMockPluginOptions = {}): PluginOption => {
  return {
    async configureServer(server) {
      const availablePort = await getPort({ port });
      if (availablePort !== port) {
        consola.warn(
          colors.yellow(
            `Port ${port} is already in use. Mock server cannot start. Please free the port and try again.`,
          ),
        );
        return;
      }

      const pkg = await getPackage(mockServerPackage);
      if (!pkg) {
        consola.log(
          `Package ${mockServerPackage} not found. Skip mock server.`,
        );
        return;
      }

      runNitroServer(pkg.dir, port, verbose);

      const _printUrls = server.printUrls;
      server.printUrls = () => {
        _printUrls();

        consola.log(
          `  ${colors.green('➜')}  ${colors.bold('Nitro Mock Server')}: ${colors.cyan(`http://localhost:${port}/api`)}`,
        );
      };
    },
    enforce: 'pre',
    name: 'vite:mock-server',
  };
};

async function runNitroServer(rootDir: string, port: number, verbose: boolean) {
  let nitro: any;
  const reload = async () => {
    try {
      if (nitro) {
        consola.info('Restarting dev server...');
        if ('unwatch' in nitro.options._c12) {
          await nitro.options._c12.unwatch();
        }
        await nitro.close();
      }
      nitro = await createNitro(
        {
          dev: true,
          preset: 'nitro-dev',
          rootDir,
        },
        {
          c12: {
            async onUpdate({ getDiff, newConfig }) {
              const diff = getDiff();
              if (diff.length === 0) {
                return;
              }
              verbose &&
                consola.info(
                  `Nitro config updated:\n${diff
                    .map((entry) => `  ${entry.toString()}`)
                    .join('\n')}`,
                );
              await (diff.every((e) => hmrKeyRe.test(e.key))
                ? nitro.updateConfig(newConfig.config)
                : reload());
            },
          },
          watch: true,
        },
      );
      nitro.hooks.hookOnce('restart', reload);

      const server = createDevServer(nitro);
      await server.listen(port, { showURL: false });
      await prepare(nitro);
      await build(nitro);

      if (verbose) {
        console.log('');
        consola.success(
          colors.bold(colors.green('Nitro Mock Server started.')),
        );
      }
    } catch (error) {
      consola.error(
        colors.red(
          `Failed to start Nitro Mock Server: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  };
  return await reload();
}
