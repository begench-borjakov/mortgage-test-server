import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { Database } from './schema';
import { DATABASE_CONSTANTS } from './constants';
import { databaseSchema } from './schema';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'DATABASE',
      useFactory: async (configService: ConfigService): Promise<Database> => {
        const connection = mysql.createPool({
          host: configService.get<string>('DB_HOST') ?? '127.0.0.1',
          port: parseInt(configService.get<string>('DB_PORT') ?? '3306', 10),
          user: configService.get<string>('DB_USER') ?? 'root',
          password: configService.get<string>('DB_PASSWORD') || undefined,
          database: configService.get<string>('DB_NAME'),
          timezone: DATABASE_CONSTANTS.DEFAULT_TIMEZONE,
          dateStrings: true
        });

        return drizzle(connection, {
          schema: databaseSchema,
          mode: 'default'
        }) as Database;
      },
      inject: [ConfigService]
    }
  ],
  exports: ['DATABASE']
})
export class DatabaseModule {}
