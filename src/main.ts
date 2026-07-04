import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common'; // 👈 MUST ADD THIS
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  // ✅ Enable CORS with restricted origins
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://yourfrontenddomain.com',
      'https://amir-imani2025-dashboard.vercel.app',
      'https://amir-imani20.vercel.app',
      'https://admin.doundogames.com',
      'https://doundogames.com',
      'https://www.doundogames.com',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // ✅ Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips non-DTO properties
      transform: true, // Converts payloads to DTO instances
    }),
  );

  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
