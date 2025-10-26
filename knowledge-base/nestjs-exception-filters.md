# NestJS Exception Filters - Complete Guide

## Table of Contents
1. [What are Exception Filters?](#what-are-exception-filters)
2. [Built-in HTTP Exceptions](#built-in-http-exceptions)
3. [Exception Filter Execution](#exception-filter-execution)
4. [Creating Custom Filters](#creating-custom-filters)
5. [Filter Scopes](#filter-scopes)
6. [Real-World Examples](#real-world-examples)
7. [Best Practices](#best-practices)

---

## What are Exception Filters?

**Exception Filters** are responsible for catching exceptions thrown anywhere in your application and converting them into appropriate HTTP responses. They implement the `ExceptionFilter` interface and are decorated with `@Catch()`.

### Key Characteristics

- Catch exceptions thrown by pipes, guards, interceptors, or controllers
- Transform exceptions into user-friendly error responses
- Log errors for debugging and monitoring
- Provide consistent error format across your API
- Can catch specific exception types or all exceptions

### Request/Response Lifecycle with Exception Filters

```
Incoming Request
       ↓
┌──────────────────┐
│   Middleware     │  ← Can throw exceptions
└────────┬─────────┘
         ↓
┌──────────────────┐
│     Guards       │  ← Can throw exceptions
└────────┬─────────┘
         ↓
┌──────────────────┐
│  Interceptors    │  ← Can throw exceptions
└────────┬─────────┘
         ↓
┌──────────────────┐
│     Pipes        │  ← Can throw exceptions
└────────┬─────────┘
         ↓
┌──────────────────┐
│  Route Handler   │  ← Can throw exceptions
└────────┬─────────┘
         ↓
         │ Exception thrown?
         │
    ┌────┴────┐
    │   NO    │  YES
    │         │   ↓
    ▼         ▼
    │  ┌──────────────────┐
    │  │ EXCEPTION        │  ← Catches ALL exceptions
    │  │ FILTERS          │     from anywhere above
    │  └────────┬─────────┘
    │           │
    └───────────┤
                ↓
          Response to Client
          (Success or Error)
```

---

## Built-in HTTP Exceptions

NestJS provides many built-in HTTP exception classes that extend `HttpException`.

### Common HTTP Exceptions

| Exception | Status Code | Use Case |
|-----------|-------------|----------|
| `BadRequestException` | 400 | Invalid request data, validation errors |
| `UnauthorizedException` | 401 | Missing or invalid authentication |
| `ForbiddenException` | 403 | User lacks permission to access resource |
| `NotFoundException` | 404 | Resource not found |
| `MethodNotAllowedException` | 405 | HTTP method not supported |
| `NotAcceptableException` | 406 | Cannot produce requested content type |
| `RequestTimeoutException` | 408 | Request took too long |
| `ConflictException` | 409 | Resource conflict (duplicate, etc.) |
| `GoneException` | 410 | Resource permanently deleted |
| `PayloadTooLargeException` | 413 | Request body too large |
| `UnsupportedMediaTypeException` | 415 | Unsupported content type |
| `UnprocessableEntityException` | 422 | Semantic errors in request |
| `InternalServerErrorException` | 500 | Server error |
| `NotImplementedException` | 501 | Feature not implemented |
| `BadGatewayException` | 502 | Upstream server error |
| `ServiceUnavailableException` | 503 | Service temporarily unavailable |
| `GatewayTimeoutException` | 504 | Upstream server timeout |

### Using Built-in Exceptions

```typescript
import {
  Controller,
  Get,
  Param,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    
    if (!user) {
      // Throw built-in exception
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return user;
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    const existingUser = await this.usersService.findByEmail(
      createUserDto.email
    );
    
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }
    
    return this.usersService.create(createUserDto);
  }

  @Get('profile')
  async getProfile(@Headers('authorization') auth: string) {
    if (!auth) {
      throw new UnauthorizedException('No token provided');
    }
    
    return this.usersService.getProfile(auth);
  }
}
```

### Custom Exception Responses

```typescript
// Simple message
throw new NotFoundException('User not found');

// Custom object
throw new NotFoundException({
  statusCode: 404,
  message: 'User not found',
  error: 'Not Found',
  timestamp: new Date().toISOString(),
});

// Array of errors
throw new BadRequestException({
  message: 'Validation failed',
  errors: [
    { field: 'email', message: 'Invalid email format' },
    { field: 'password', message: 'Too short' },
  ],
});
```

---

## Exception Filter Execution

### How Filters Work

```
Exception Thrown
       ↓
┌──────────────────────────────────────────────┐
│  NestJS looks for Exception Filters in order: │
│                                                │
│  1. Method-level filters                      │
│  2. Controller-level filters                  │
│  3. Global filters                            │
│                                                │
│  First matching filter handles the exception  │
└────────────────┬───────────────────────────────┘
                 ↓
         ┌───────────────┐
         │ Filter catches │
         │   exception    │
         └───────┬────────┘
                 ↓
         ┌───────────────┐
         │ Filter formats │
         │    response    │
         └───────┬────────┘
                 ↓
         ┌───────────────┐
         │ Send response  │
         │   to client    │
         └───────────────┘
```

### Filter Matching

Filters are matched based on the `@Catch()` decorator:

```typescript
@Catch(HttpException)        // Catches HttpException and subclasses
@Catch(NotFoundException)    // Catches only NotFoundException
@Catch(TypeError, RangeError) // Catches multiple specific types
@Catch()                     // Catches ALL exceptions
```

---

## Creating Custom Filters

### Basic HTTP Exception Filter

```typescript
// http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Extract error message
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message || 'An error occurred';

    // Custom error response format
    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: message,
    });
  }
}
```

**Response Example:**
```json
{
  "success": false,
  "statusCode": 404,
  "timestamp": "2024-10-27T10:30:45.123Z",
  "path": "/users/123",
  "method": "GET",
  "message": "User not found"
}
```

### Catch All Exceptions Filter

```typescript
// all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()  // ← No argument = catch everything
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    // Determine status code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Determine error message
    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
        ? exception.message
        : 'Internal server error';

    // Log the error
    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : 'Unknown error'
    );

    // Send response
    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
      // Include stack trace only in development
      ...(process.env.NODE_ENV === 'development' &&
        exception instanceof Error && { stack: exception.stack }),
    });
  }
}
```

### Database Exception Filter

```typescript
// database-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    // Log database error
    this.logger.error('Database error:', exception.message);

    // Check for specific database errors
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database error occurred';

    // PostgreSQL/MySQL duplicate key error
    if ((exception as any).code === '23505' || (exception as any).code === 'ER_DUP_ENTRY') {
      status = HttpStatus.CONFLICT;
      message = 'Duplicate entry. Resource already exists.';
    }

    // PostgreSQL foreign key violation
    if ((exception as any).code === '23503') {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid reference to related resource';
    }

    // PostgreSQL not null violation
    if ((exception as any).code === '23502') {
      status = HttpStatus.BAD_REQUEST;
      message = 'Required field is missing';
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
      ...(process.env.NODE_ENV === 'development' && {
        detail: exception.message,
      }),
    });
  }
}
```

### Validation Exception Filter

```typescript
// validation-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    // Format validation errors nicely
    const errors = Array.isArray(exceptionResponse.message)
      ? exceptionResponse.message
      : [exceptionResponse.message];

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: 'Validation Error',
      message: 'Request validation failed',
      validationErrors: errors,
    });
  }
}
```

**Response Example:**
```json
{
  "success": false,
  "statusCode": 400,
  "timestamp": "2024-10-27T10:30:45.123Z",
  "path": "/users",
  "error": "Validation Error",
  "message": "Request validation failed",
  "validationErrors": [
    "email must be an email",
    "password must be longer than 8 characters"
  ]
}
```

---

## Filter Scopes

Exception filters can be applied at different scopes.

### 1. Global Scope (Entire Application)

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { HttpExceptionFilter } from './filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply global exception filters
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new HttpExceptionFilter(),
  );

  await app.listen(3000);
}
bootstrap();
```

### 2. Module Scope (with Dependency Injection)

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { DatabaseExceptionFilter } from './filters/database-exception.filter';

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: DatabaseExceptionFilter,
    },
  ],
})
export class AppModule {}
```

**Benefit**: Filters can use dependency injection (services, config, etc.)

### 3. Controller Scope

```typescript
// users.controller.ts
import { Controller, UseFilters } from '@nestjs/common';
import { HttpExceptionFilter } from './filters/http-exception.filter';

@Controller('users')
@UseFilters(HttpExceptionFilter)  // ← Applies to all routes in controller
export class UsersController {
  @Get()
  findAll() {
    // Protected by HttpExceptionFilter
  }

  @Get(':id')
  findOne() {
    // Protected by HttpExceptionFilter
  }
}
```

### 4. Method Scope (Single Route)

```typescript
// users.controller.ts
import { Controller, Get, UseFilters } from '@nestjs/common';
import { DatabaseExceptionFilter } from './filters/database-exception.filter';

@Controller('users')
export class UsersController {
  @Get(':id')
  @UseFilters(DatabaseExceptionFilter)  // ← Applies only to this route
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
```

### Scope Priority

```
Method Scope (Highest priority)
       ↓
Controller Scope
       ↓
Global Scope (Lowest priority)
       ↓
Built-in Exception Handler (Default)
```

**First matching filter handles the exception.**

---

## Real-World Examples

### Example 1: E-commerce API with Comprehensive Error Handling

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { HttpExceptionFilter } from './filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Global exception handling
  app.useGlobalFilters(
    new AllExceptionsFilter(),      // Catches everything
    new HttpExceptionFilter(),      // Catches HTTP exceptions
  );

  await app.listen(3000);
}
bootstrap();
```

```typescript
// products.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    return product;
  }

  @Post()
  async create(@Body() createProductDto: CreateProductDto) {
    const existing = await this.productsService.findBySku(
      createProductDto.sku
    );

    if (existing) {
      throw new ConflictException(`Product with SKU ${createProductDto.sku} already exists`);
    }

    return this.productsService.create(createProductDto);
  }
}
```

### Example 2: Logging Filter with External Service

```typescript
// logging-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { LoggingService } from '../services/logging.service';

@Injectable()
@Catch()
export class LoggingExceptionFilter implements ExceptionFilter {
  constructor(private loggingService: LoggingService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : 500;

    // Log to external service (e.g., Sentry, LogRocket)
    this.loggingService.logError({
      status,
      message: exception instanceof Error ? exception.message : 'Unknown error',
      stack: exception instanceof Error ? exception.stack : undefined,
      url: request.url,
      method: request.method,
      userId: request.user?.id,
      timestamp: new Date(),
    });

    response.status(status).json({
      success: false,
      statusCode: status,
      message: exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error',
    });
  }
}

// app.module.ts
@Module({
  providers: [
    LoggingService,
    {
      provide: APP_FILTER,
      useClass: LoggingExceptionFilter,  // Can inject LoggingService
    },
  ],
})
export class AppModule {}
```

### Example 3: API Rate Limiting with Custom Exception

```typescript
// rate-limit.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class RateLimitException extends HttpException {
  constructor(retryAfter: number) {
    super(
      {
        statusCode: 429,
        message: 'Too many requests',
        retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
  }
}

// rate-limit-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { RateLimitException } from './rate-limit.exception';

@Catch(RateLimitException)
export class RateLimitExceptionFilter implements ExceptionFilter {
  catch(exception: RateLimitException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const exceptionResponse = exception.getResponse() as any;

    response
      .status(429)
      .header('Retry-After', exceptionResponse.retryAfter.toString())
      .json({
        success: false,
        statusCode: 429,
        message: 'Rate limit exceeded',
        retryAfter: exceptionResponse.retryAfter,
        timestamp: new Date().toISOString(),
      });
  }
}

// Usage in guard
@Injectable()
export class ThrottleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Check rate limit
    const isAllowed = this.checkRateLimit();

    if (!isAllowed) {
      throw new RateLimitException(60); // Retry after 60 seconds
    }

    return true;
  }
}
```

### Example 4: Authentication Error Filter

```typescript
// auth-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  UnauthorizedException,
} from '@nestjs/common';

@Catch(UnauthorizedException)
export class AuthExceptionFilter implements ExceptionFilter {
  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    response.status(401).json({
      success: false,
      statusCode: 401,
      message: 'Authentication required',
      error: 'Unauthorized',
      timestamp: new Date().toISOString(),
      path: request.url,
      // Provide helpful information
      help: {
        message: 'Please provide a valid authentication token',
        documentation: 'https://api.example.com/docs/auth',
      },
    });
  }
}
```

### Example 5: Business Logic Exception Handler

```typescript
// business-logic.exception.ts
export class InsufficientFundsException extends Error {
  constructor(public required: number, public available: number) {
    super('Insufficient funds');
    this.name = 'InsufficientFundsException';
  }
}

export class ProductOutOfStockException extends Error {
  constructor(public productId: string) {
    super(`Product ${productId} is out of stock`);
    this.name = 'ProductOutOfStockException';
  }
}

// business-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import {
  InsufficientFundsException,
  ProductOutOfStockException,
} from './business-logic.exception';

@Catch(InsufficientFundsException, ProductOutOfStockException)
export class BusinessExceptionFilter implements ExceptionFilter {
  catch(
    exception: InsufficientFundsException | ProductOutOfStockException,
    host: ArgumentsHost
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof InsufficientFundsException) {
      return response.status(400).json({
        success: false,
        statusCode: 400,
        error: 'Insufficient Funds',
        message: 'You do not have enough funds for this transaction',
        details: {
          required: exception.required,
          available: exception.available,
          shortfall: exception.required - exception.available,
        },
      });
    }

    if (exception instanceof ProductOutOfStockException) {
      return response.status(409).json({
        success: false,
        statusCode: 409,
        error: 'Out of Stock',
        message: 'The requested product is currently out of stock',
        details: {
          productId: exception.productId,
        },
      });
    }
  }
}
```

---

## Best Practices

### 1. Use Global Exception Filter

```typescript
// ✅ GOOD - Catch all unhandled exceptions
app.useGlobalFilters(new AllExceptionsFilter());

// ❌ BAD - No global filter means some exceptions may not be handled
```

### 2. Separate Concerns

```typescript
// ✅ GOOD - Specific filters for specific exceptions
@Catch(HttpException)
export class HttpExceptionFilter {}

@Catch(QueryFailedError)
export class DatabaseExceptionFilter {}

// ❌ BAD - One giant filter handling everything
@Catch()
export class GiantFilter {
  catch(exception: any) {
    if (exception instanceof HttpException) { }
    else if (exception instanceof QueryFailedError) { }
    // ... hundreds of lines
  }
}
```

### 3. Don't Expose Sensitive Information

```typescript
// ✅ GOOD - Hide sensitive details in production
response.json({
  statusCode: 500,
  message: 'Internal server error',
  ...(process.env.NODE_ENV === 'development' && {
    stack: exception.stack,
    details: exception.message,
  }),
});

// ❌ BAD - Exposing internal details
response.json({
  statusCode: 500,
  message: exception.message,  // May contain SQL, file paths, etc.
  stack: exception.stack,       // Security risk
});
```

### 4. Log Errors for Monitoring

```typescript
// ✅ GOOD - Log errors with context
@Catch()
export class AllExceptionsFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const request = host.switchToHttp().getRequest();
    
    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : 'Unknown error'
    );
    
    // Send response
  }
}
```

### 5. Provide Helpful Error Messages

```typescript
// ✅ GOOD - Clear, actionable messages
throw new NotFoundException({
  message: 'User not found',
  help: 'Please check the user ID and try again',
  documentation: 'https://docs.example.com/users',
});

// ❌ BAD - Vague messages
throw new NotFoundException('Error');
```

### 6. Use Appropriate HTTP Status Codes

```typescript
// ✅ GOOD - Correct status codes
throw new NotFoundException('User not found');         // 404
throw new ConflictException('Email already exists');   // 409
throw new UnauthorizedException('Invalid token');      // 401
throw new ForbiddenException('Access denied');         // 403

// ❌ BAD - Wrong status codes
throw new BadRequestException('User not found');       // Should be 404
throw new NotFoundException('Email already exists');   // Should be 409
```

### 7. Consistent Error Response Format

```typescript
// ✅ GOOD - Consistent format
{
  "success": false,
  "statusCode": 404,
  "message": "User not found",
  "timestamp": "2024-10-27T10:30:45.123Z",
  "path": "/users/123"
}

// All errors follow the same structure

// ❌ BAD - Inconsistent formats
// Sometimes: { error: "...", code: 404 }
// Other times: { message: "...", status: 404 }
```

### 8. Use Module Provider for DI Support

```typescript
// ✅ GOOD - Can inject services
@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: LoggingExceptionFilter,  // Can inject dependencies
    },
  ],
})
export class AppModule {}

// ❌ BAD - No DI support
app.useGlobalFilters(new LoggingExceptionFilter());  // Can't inject services
```

---

## Complete Example: Production-Ready Setup

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: process.env.NODE_ENV === 'production',
    })
  );

  // Global exception handling
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
```

```typescript
// all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
        ? exception.message
        : 'Internal server error';

    // Log error
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status}`,
      exception instanceof Error ? exception.stack : 'Unknown error'
    );

    // Send response
    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
      ...(process.env.NODE_ENV === 'development' &&
        exception instanceof Error && {
          stack: exception.stack,
        }),
    });
  }
}
```

---

## Summary

### Exception Filter Types

| Filter Type | Catches | Use Case |
|-------------|---------|----------|
| **HTTP Exception Filter** | `HttpException` | Standard HTTP errors |
| **All Exceptions Filter** | Everything | Catch-all safety net |
| **Database Exception Filter** | `QueryFailedError` | Database-specific errors |
| **Validation Exception Filter** | `BadRequestException` | Validation errors |
| **Business Exception Filter** | Custom exceptions | Domain-specific errors |

### Key Principles

1. **Always have a global filter** - Safety net for unhandled exceptions
2. **Use specific filters** for specific exception types
3. **Don't expose sensitive information** in production
4. **Log all errors** for debugging and monitoring
5. **Provide consistent error format** across your API
6. **Use appropriate HTTP status codes**
7. **Make error messages helpful** and actionable
8. **Apply filters at the right scope** - Global, controller, or method

### Exception Flow

```
Exception Thrown → Filter Catches → Format Response → Log Error → Send to Client
```

### Relationship with Other Components

```
Pipes throw → Exception Filters catch
Guards throw → Exception Filters catch
Interceptors throw → Exception Filters catch
Controllers throw → Exception Filters catch
```

Exception Filters are the **last line of defense** in your NestJS application, ensuring all errors are properly handled and formatted before being sent to the client. Master them for building robust, production-ready APIs!

