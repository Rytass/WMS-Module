import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VaultModule, VaultService } from '@rytass/secret-adapter-vault-nestjs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WmsModuleGraphqlModule } from '@rytass/wms-module-graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { resolve } from 'path';
import { FilesModule } from './files/files.module';

@Module({
  imports: [
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
          synchronize: (await vault.get<string>('NODE_ENV')) !== 'development',
          logging: 'all',
          uuidExtension: 'uuid-ossp',
        };
      },
      imports: [VaultModule],
      inject: [VaultService],
    }),
    WmsModuleGraphqlModule.forRootAsync(
      {
        useFactory: async () => ({}),
        defaultLoaderSerialId: 'DEFAULT',
        defaultLoaderTypeKey: 'DEFAULT',
        defaultLocationKey: 'DEFAULT',
      },
      {
        driver: ApolloDriver,
        useFactory: async () => ({
          playground: false,
          introspection: true,
          cors: true,
          csrfPrevention: false,
          plugins: [ApolloServerPluginLandingPageLocalDefault()],
          autoTransformHttpErrors: true,
          autoSchemaFile: resolve(process.cwd(), 'schema.gql'),
        }),
      },
    ),
    FilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
