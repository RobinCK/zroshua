import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './app.module';
import { EventsService } from './events/events.service';
import { env } from './env';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const publicDir = path.resolve(env.publicDir);
  if (fs.existsSync(publicDir)) {
    app.useStaticAssets(publicDir, { index: false });
    // SPA fallback: everything that is not /api goes to index.html
    app.use((req: any, res: any, next: any) => {
      if (req.path.startsWith('/api') || req.path.includes('.')) return next();
      res.sendFile(path.join(publicDir, 'index.html'));
    });
  }

  const server = await app.listen(env.port, '0.0.0.0');
  app.get(EventsService).attach(server);
  new Logger('Bootstrap').log(`Zroshua listening on :${env.port}`);
}

bootstrap();
