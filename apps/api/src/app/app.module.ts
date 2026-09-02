import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VaultModule, VaultService } from '@rytass/secret-adapter-vault-nestjs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import {
  LoaderService,
  WmsModuleGraphqlModule,
  createWmsLoaders,
} from '@rytass/wms-module-graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { resolve } from 'path';
import { FilesModule } from './files/files.module';

@Module({
  imports: [
    // Local-dev escape hatch: when DB_HOST is set in the environment, connect
    // straight to it and skip Vault entirely (Vault creds are cluster-only).
    // Production/staging behaviour (Vault-driven config) is unchanged.
    ...(process.env.DB_HOST
      ? [
          TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 5432),
            username: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            schema: process.env.DB_SCHEMA || 'public',
            autoLoadEntities: true,
            synchronize: process.env.DB_SYNC === 'YES',
            logging: process.env.DB_LOGGING === 'YES' ? 'all' : false,
            uuidExtension: 'uuid-ossp',
            // Some service queries use raw table names (no schema prefix); align
            // the connection search_path with the configured schema.
            extra: {
              // keep public on the path: extension functions (uuid-ossp) live there
              options: `-c search_path=${process.env.DB_SCHEMA || 'public'},public`,
            },
          }),
        ]
      : [
          VaultModule.forRoot({
            path: process.env.VAULT_PATH || 'wms-module/develop',
          }),
          TypeOrmModule.forRootAsync({
            useFactory: async (vault: VaultService) => {
              return {
                type: 'postgres',
                host: await vault.get<string>('DB_HOST'),
                port: 5432,
                username: await vault.get<string>('DB_USER'),
                password: await vault.get<string>('DB_PASS'),
                database: await vault.get<string>('DB_NAME'),
                schema: await vault.get<string>('DB_SCHEMA'),
                autoLoadEntities: true,
                synchronize:
                  (await vault.get<string>('NODE_ENV')) !== 'development',
                logging: 'all',
                uuidExtension: 'uuid-ossp',
              };
            },
            imports: [VaultModule],
            inject: [VaultService],
          }),
        ]),
    WmsModuleGraphqlModule.forRootAsync({
      useFactory: async () => ({}),
      defaultLoaderSerialId: 'DEFAULT',
      defaultLoaderTypeKey: 'DEFAULT',
      defaultLocationKey: 'DEFAULT',
    }),
    GraphQLModule.forRootAsync({
      driver: ApolloDriver,
      inject: [LoaderService],
      useFactory: (loaderService: LoaderService) => ({
        playground: false,
        introspection: true,
        cors: true,
        csrfPrevention: false,
        plugins: [ApolloServerPluginLandingPageLocalDefault()],
        autoTransformHttpErrors: true,
        autoSchemaFile: resolve(process.cwd(), 'schema.gql'),
        // Per-request dataloaders; createWmsLoaders returns { loaders } wrapped
        context: () => ({
          ...createWmsLoaders(loaderService),
        }),
      }),
    }),
    FilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
