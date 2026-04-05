import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('admin');
  await app.listen(3001);
  console.log('Admin server running on http://localhost:3001');
}
bootstrap();
