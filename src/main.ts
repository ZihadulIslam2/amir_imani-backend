import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common'; // 👈 MUST ADD THIS
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

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

  // ✅ Scalar API Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Amir Imani API')
    .setDescription('Full API reference for the Amir Imani e-commerce platform')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
      },
      'JWT-auth', // This name matches the one used in @ApiBearerAuth('JWT-auth')
    )
    .addServer('http://localhost:5000', 'Local Development Server')
    .addServer('https://api.domain.co', 'Production Server')
    .addServer('/', 'Relative path Server')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  app.getHttpAdapter().get('/api-docs-json', (req, res) => {
    res.json(document);
  });

  app.use(
    '/api-docs',
    apiReference({
      theme: 'purple',
      spec: {
        content: document,
      },
      persistAuth: true,
      proxyUrl: 'https://proxy.scalar.com',
      onBeforeRequest: ({ requestBuilder }) => {
        try {
          const headers = requestBuilder?.headers;
          if (!headers || typeof headers.forEach !== 'function') return;
          headers.forEach((value: unknown, key: string) => {
            if (typeof value === 'string' && /[^\x00-\xFF]/u.test(value)) {
              headers.set(key, value.replace(/[^\x00-\xFF]/gu, ''));
            }
          });
        } catch (e) {
          console.warn('[Scalar] Header sanitization error:', e);
        }
      },
    }),
  );

  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
