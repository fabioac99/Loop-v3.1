import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // Global prefix for all API routes, exclude swagger paths
  app.setGlobalPrefix('api', {
    exclude: ['docs', 'docs/(.*)', 'docs-json', 'docs-yaml'],
  });

  app.use(cookieParser());
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useWebSocketAdapter(new IoAdapter(app));

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('LOOP API')
    .setDescription(
      'Inter-department Communication & Request Management Platform.\n\n' +
      'Authenticate via **POST /api/auth/login**, then click Authorize and paste the accessToken.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'JWT access token' },
      'access-token',
    )
    .addTag('Auth', 'Authentication & session management')
    .addTag('Users', 'User CRUD (admin only)')
    .addTag('Departments', 'Department management')
    .addTag('Tickets', 'Core ticket / request system')
    .addTag('Forms', 'Dynamic form schema engine')
    .addTag('Notifications', 'In-app notifications')
    .addTag('Analytics', 'Reporting & export')
    .addTag('Audit', 'Audit log (admin only)')
    .addTag('Settings', 'System configuration (admin only)')
    .addTag('Files', 'File upload & download')
    .addTag('Search', 'Global search')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
    },
    customSiteTitle: 'LOOP API Documentation',
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`LOOP API running on http://localhost:${port}/api`);
  console.log(`Swagger docs at  http://localhost:${port}/docs`);
}
bootstrap();