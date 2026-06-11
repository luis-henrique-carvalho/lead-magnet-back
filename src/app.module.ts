import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';

import { auth } from './modules/auth/auth';
import { PrismaModule } from './infra/database/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,

    AuthModule.forRoot({
      auth,
      bodyParser: {
        json: {
          limit: '2mb',
        },
        urlencoded: {
          enabled: true,
          extended: true,
          limit: '2mb',
        },
      },
    }),
  ],
})
export class AppModule {}
