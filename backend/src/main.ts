import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Behind a reverse proxy (Render), req.ip is the proxy's address unless
  // Express trusts X-Forwarded-For — and ThrottlerGuard keys on req.ip, so
  // every client would share one 60 req/min bucket. TRUST_PROXY = number of
  // proxy hops in front of the app; unset (local dev) keeps it off so a client
  // cannot spoof its IP with the header.
  const trustProxy = Number(process.env.TRUST_PROXY ?? 0);
  if (trustProxy > 0) app.set('trust proxy', trustProxy);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties not in the DTO
      transform: true, // auto-transform payloads to DTO instances
    }),
  );
  app.enableCors();
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}/api/v1`);
}
bootstrap();
