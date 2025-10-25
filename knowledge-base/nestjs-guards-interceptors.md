# NestJS Guards and Interceptors - Complete Guide

## Table of Contents
1. [Overview](#overview)
2. [Guards](#guards)
3. [Interceptors](#interceptors)
4. [Execution Order](#execution-order)
5. [Real-World Examples](#real-world-examples)
6. [Integration with Main App](#integration-with-main-app)

---

## Overview

Guards and Interceptors are powerful NestJS features that implement the **Aspect-Oriented Programming (AOP)** pattern, allowing you to add cross-cutting concerns without cluttering your business logic.

### Request/Response Lifecycle Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Incoming HTTP Request                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
              ┌───────────────┐
              │  Middleware   │  (Express/Fastify middleware)
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │    Guards     │  ← Can block request (return false)
              └───────┬───────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  Interceptors (BEFORE) │  ← Transform request, add logic
         └────────┬───────────────┘
                  │
                  ▼
         ┌────────────────┐
         │     Pipes      │  ← Validate/transform parameters
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────────┐
         │  Route Handler     │  ← Your controller method
         │  (Controller)      │
         └────────┬───────────┘
                  │
                  ▼
         ┌────────────────────────┐
         │  Interceptors (AFTER)  │  ← Transform response
         └────────┬───────────────┘
                  │
                  ▼
         ┌────────────────────────┐
         │  Exception Filters     │  ← Handle errors
         └────────┬───────────────┘
                  │
                  ▼
         ┌────────────────────────┐
         │   HTTP Response        │
         └────────────────────────┘
```

---

## Guards

### What Are Guards?

Guards are classes that implement the `CanActivate` interface. They determine whether a request should be processed by the route handler based on certain conditions (authentication, authorization, roles, etc.).

### Key Characteristics

- **Purpose**: Authentication & Authorization
- **Interface**: `CanActivate`
- **Special Method**: `canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean>`
- **Return Value**: 
  - `true` → Request proceeds
  - `false` → Request blocked (403 Forbidden)
- **Execution**: After middleware, before interceptors

### Guard Architecture Diagram

```
┌──────────────────────────────────────────────────────┐
│                    Request Flow                       │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  Guard Checks  │
              │  canActivate() │
              └────────┬───────┘
                       │
           ┌───────────┴───────────┐
           │                       │
           ▼                       ▼
    ┌──────────┐           ┌──────────┐
    │  TRUE    │           │  FALSE   │
    │ (Allow)  │           │ (Block)  │
    └────┬─────┘           └────┬─────┘
         │                      │
         ▼                      ▼
  ┌─────────────┐      ┌──────────────────┐
  │ Continue to │      │ Return 403       │
  │ Route       │      │ Forbidden        │
  └─────────────┘      └──────────────────┘
```

### Real-World Example 1: Authentication Guard

**Scenario**: Protect routes that require a logged-in user

```typescript
// auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      throw new UnauthorizedException('No token provided');
    }
    
    // Expected format: "Bearer <token>"
    const [bearer, token] = authHeader.split(' ');
    
    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid token format');
    }
    
    // Validate token (simplified - use JWT library in production)
    const isValid = this.validateToken(token);
    
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    
    // Attach user info to request for use in controllers
    request.user = this.getUserFromToken(token);
    
    return true;
  }
  
  private validateToken(token: string): boolean {
    // In real app: verify JWT signature, check expiration, etc.
    // Using jose, jsonwebtoken, or @nestjs/jwt
    return token.length > 10; // Simplified validation
  }
  
  private getUserFromToken(token: string): any {
    // In real app: decode JWT and extract user data
    return { id: 1, email: 'user@example.com', role: 'user' };
  }
}
```

**Usage in Controller:**

```typescript
// users.controller.ts
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from './guards/auth.guard';

@Controller('users')
export class UsersController {
  
  // Public route - no guard
  @Get('public')
  getPublicData() {
    return { message: 'This is public data' };
  }
  
  // Protected route - requires authentication
  @Get('profile')
  @UseGuards(AuthGuard)
  getProfile(@Request() req) {
    // req.user is available because AuthGuard attached it
    return {
      message: 'This is private data',
      user: req.user
    };
  }
}
```

### Real-World Example 2: Role-Based Authorization Guard

**Scenario**: Restrict access based on user roles (admin, user, moderator)

```typescript
// roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

```typescript
// roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  
  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator metadata
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    // If no roles required, allow access
    if (!requiredRoles) {
      return true;
    }
    
    // Get user from request (set by AuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      return false;
    }
    
    // Check if user has at least one of the required roles
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

**Usage in Controller:**

```typescript
// admin.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './guards/roles.decorator';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard) // Apply both guards to entire controller
export class AdminController {
  
  // Only admins can access
  @Get('dashboard')
  @Roles('admin')
  getDashboard() {
    return { message: 'Admin Dashboard' };
  }
  
  // Admins and moderators can access
  @Get('moderation')
  @Roles('admin', 'moderator')
  getModerationPanel() {
    return { message: 'Moderation Panel' };
  }
  
  // Any authenticated user (no @Roles decorator)
  @Get('stats')
  getStats() {
    return { message: 'Public Stats' };
  }
}
```

### Real-World Example 3: API Rate Limiting Guard

**Scenario**: Prevent abuse by limiting requests per user

```typescript
// throttle.guard.ts
import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class ThrottleGuard implements CanActivate {
  private requests = new Map<string, { count: number; resetTime: number }>();
  private readonly limit = 10; // 10 requests
  private readonly windowMs = 60000; // per 1 minute
  
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection.remoteAddress;
    
    const now = Date.now();
    const userRequests = this.requests.get(ip);
    
    // First request from this IP
    if (!userRequests) {
      this.requests.set(ip, { count: 1, resetTime: now + this.windowMs });
      return true;
    }
    
    // Time window expired, reset counter
    if (now > userRequests.resetTime) {
      this.requests.set(ip, { count: 1, resetTime: now + this.windowMs });
      return true;
    }
    
    // Within time window, check limit
    if (userRequests.count >= this.limit) {
      throw new HttpException(
        'Too many requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
    
    // Increment counter
    userRequests.count++;
    return true;
  }
}
```

**Usage:**

```typescript
@Controller('api')
export class ApiController {
  
  @Get('data')
  @UseGuards(ThrottleGuard)
  getData() {
    return { data: 'expensive operation' };
  }
}
```

---

## Interceptors

### What Are Interceptors?

Interceptors are classes that implement the `NestInterceptor` interface. They can transform the result returned from a function, transform exceptions, extend basic function behavior, or completely override a function.

### Key Characteristics

- **Purpose**: Transform requests/responses, logging, caching, timeout handling
- **Interface**: `NestInterceptor`
- **Special Method**: `intercept(context: ExecutionContext, next: CallHandler): Observable<any>`
- **Capabilities**:
  - Execute logic **before** route handler
  - Execute logic **after** route handler
  - Transform response data
  - Transform exceptions
  - Extend function behavior
- **Power**: Uses RxJS operators for advanced data manipulation

### Interceptor Architecture Diagram

```
┌────────────────────────────────────────────────────┐
│              Interceptor Execution                  │
└────────────────────┬───────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  BEFORE Route Handler  │
        │  - Logging             │
        │  - Modify request      │
        │  - Start timer         │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │  next.handle()     │  ← Calls route handler
        └────────┬───────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │   Route Handler        │
        │   Returns data         │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  Observable stream     │
        │  with RxJS operators   │
        │  - map()               │
        │  - tap()               │
        │  - catchError()        │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  AFTER Route Handler   │
        │  - Transform response  │
        │  - Log result          │
        │  - Calculate duration  │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │  Return to client  │
        └────────────────────┘
```

### Real-World Example 1: Logging Interceptor

**Scenario**: Log all requests with execution time and response status

```typescript
// logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const now = Date.now();
    
    // Log incoming request
    this.logger.log(`Incoming Request: ${method} ${url}`);
    if (Object.keys(body).length > 0) {
      this.logger.debug(`Request Body: ${JSON.stringify(body)}`);
    }
    
    // Continue to route handler and log after completion
    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - now;
          this.logger.log(
            `Outgoing Response: ${method} ${url} - ${duration}ms - Success`
          );
          this.logger.debug(`Response Data: ${JSON.stringify(data)}`);
        },
        error: (error) => {
          const duration = Date.now() - now;
          this.logger.error(
            `Outgoing Response: ${method} ${url} - ${duration}ms - Error: ${error.message}`
          );
        }
      })
    );
  }
}
```

**Console Output Example:**
```
[LoggingInterceptor] Incoming Request: POST /users
[LoggingInterceptor] Request Body: {"name":"John","email":"john@example.com"}
[LoggingInterceptor] Outgoing Response: POST /users - 45ms - Success
[LoggingInterceptor] Response Data: {"id":1,"name":"John","email":"john@example.com"}
```

### Real-World Example 2: Response Transform Interceptor

**Scenario**: Wrap all responses in a consistent format with metadata

```typescript
// transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  statusCode: number;
  timestamp: string;
  path: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();
    const statusCode = context.switchToHttp().getResponse().statusCode;
    
    return next.handle().pipe(
      map(data => ({
        success: true,
        statusCode,
        timestamp: new Date().toISOString(),
        path: request.url,
        data
      }))
    );
  }
}
```

**Before Interceptor:**
```json
{
  "id": 1,
  "name": "John"
}
```

**After Interceptor:**
```json
{
  "success": true,
  "statusCode": 200,
  "timestamp": "2025-10-25T12:30:45.123Z",
  "path": "/users/1",
  "data": {
    "id": 1,
    "name": "John"
  }
}
```

### Real-World Example 3: Timeout Interceptor

**Scenario**: Automatically timeout long-running requests

```typescript
// timeout.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly timeoutMs = 5000; // 5 seconds
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError(err => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException('Request took too long to process'));
        }
        return throwError(() => err);
      })
    );
  }
}
```

### Real-World Example 4: Cache Interceptor

**Scenario**: Cache GET requests to improve performance

```typescript
// cache.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private cache = new Map<string, any>();
  private readonly cacheDuration = 60000; // 1 minute
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }
    
    const cacheKey = request.url;
    const cachedResponse = this.cache.get(cacheKey);
    
    // Return cached response if exists and not expired
    if (cachedResponse) {
      const { data, timestamp } = cachedResponse;
      if (Date.now() - timestamp < this.cacheDuration) {
        console.log(`Cache HIT: ${cacheKey}`);
        return of(data);
      } else {
        // Expired, remove from cache
        this.cache.delete(cacheKey);
      }
    }
    
    // No cache, proceed to route handler
    console.log(`Cache MISS: ${cacheKey}`);
    return next.handle().pipe(
      tap(data => {
        // Store response in cache
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
      })
    );
  }
}
```

### Real-World Example 5: Error Transform Interceptor

**Scenario**: Convert all errors to a consistent format

```typescript
// errors.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError(err => {
        // If already an HttpException, pass through
        if (err instanceof HttpException) {
          return throwError(() => err);
        }
        
        // Transform other errors to consistent format
        const status = err.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const message = err.message || 'Internal server error';
        
        return throwError(() => new HttpException({
          success: false,
          statusCode: status,
          timestamp: new Date().toISOString(),
          message,
          error: err.name || 'Error'
        }, status));
      })
    );
  }
}
```

---

## Execution Order

### Multiple Guards

Guards execute in the order they're declared:

```typescript
@Controller('users')
@UseGuards(AuthGuard, RolesGuard, ThrottleGuard) // Executes: Auth → Roles → Throttle
export class UsersController {
  @Get()
  findAll() { }
}
```

### Multiple Interceptors

Interceptors execute in a specific pattern:

```typescript
@UseInterceptors(LoggingInterceptor, TransformInterceptor, CacheInterceptor)
@Controller('users')
export class UsersController { }
```

**Execution Flow:**

```
Request
  ↓
Logging BEFORE
  ↓
Transform BEFORE
  ↓
Cache BEFORE (checks cache)
  ↓
Route Handler
  ↓
Cache AFTER (stores cache)
  ↓
Transform AFTER (wraps response)
  ↓
Logging AFTER (logs result)
  ↓
Response
```

### Scope Levels

Guards and Interceptors can be applied at three levels:

```
┌──────────────────────────────────────────────┐
│          Global Scope (App-wide)             │
│  app.useGlobalGuards(...)                    │
│  app.useGlobalInterceptors(...)              │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│       Controller Scope (All routes)          │
│  @UseGuards(...) on class                    │
│  @UseInterceptors(...) on class              │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│       Method Scope (Single route)            │
│  @UseGuards(...) on method                   │
│  @UseInterceptors(...) on method             │
└──────────────────────────────────────────────┘
```

**Execution Order**: Global → Controller → Method

---

## Integration with Main App

### Project Structure

```
src/
├── main.ts                          ← Bootstrap file
├── app.module.ts                    ← Root module
├── common/                          ← Shared utilities
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   ├── roles.guard.ts
│   │   └── throttle.guard.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   ├── transform.interceptor.ts
│   │   ├── timeout.interceptor.ts
│   │   └── cache.interceptor.ts
│   └── decorators/
│       └── roles.decorator.ts
├── users/
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
└── admin/
    ├── admin.controller.ts
    ├── admin.service.ts
    └── admin.module.ts
```

### Method 1: Global Registration (main.ts)

Apply to **all routes** in the application:

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Register global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
    new TimeoutInterceptor()
  );
  
  await app.listen(3000);
  console.log('Application is running on: http://localhost:3000');
}
bootstrap();
```

**Note**: Global guards/interceptors registered this way **cannot inject dependencies**. For dependency injection, use Method 2.

### Method 2: Module-Level Registration (app.module.ts)

Apply globally with **dependency injection** support:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [UsersModule, AdminModule],
  providers: [
    // Global Guards (with DI support)
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Global Interceptors (with DI support)
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
```

### Method 3: Controller-Level Registration

Apply to **all routes in a controller**:

```typescript
// users.controller.ts
import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { CacheInterceptor } from '../common/interceptors/cache.interceptor';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AuthGuard)                    // All routes protected
@UseInterceptors(CacheInterceptor)       // All routes cached
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  
  @Get()
  findAll() {
    return this.usersService.findAll();
  }
  
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
```

### Method 4: Method-Level Registration

Apply to **specific route only**:

```typescript
// users.controller.ts
import { Controller, Get, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CacheInterceptor } from '../common/interceptors/cache.interceptor';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  
  // Public route - no protection
  @Get('public')
  getPublicData() {
    return { message: 'Public data' };
  }
  
  // Protected route with caching
  @Get()
  @UseGuards(AuthGuard)
  @UseInterceptors(CacheInterceptor)
  findAll() {
    return this.usersService.findAll();
  }
  
  // Admin-only route
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}
```

### Complete Integration Example

Here's a complete example showing how everything connects:

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Global timeout for all requests
  app.useGlobalInterceptors(new TimeoutInterceptor());
  
  await app.listen(3000);
}
bootstrap();
```

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthGuard } from './common/guards/auth.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [UsersModule, AdminModule],
  providers: [
    // Global authentication for all routes
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    // Global logging
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Global response transformation
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
```

```typescript
// users/users.controller.ts
import { Controller, Get, Post, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CacheInterceptor } from '../common/interceptors/cache.interceptor';
import { UsersService } from './users.service';

@Controller('users')
@UseInterceptors(CacheInterceptor)  // Cache all GET requests in this controller
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  
  @Get()
  findAll() {
    // Protected by global AuthGuard
    // Logged by global LoggingInterceptor
    // Response wrapped by global TransformInterceptor
    // Cached by controller-level CacheInterceptor
    // Timeout by global TimeoutInterceptor
    return this.usersService.findAll();
  }
  
  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() createUserDto: CreateUserDto) {
    // Additional role check on top of global auth
    return this.usersService.create(createUserDto);
  }
}
```

### Request Flow Diagram with All Components

```
┌─────────────────────────────────────────────────────────┐
│           POST /users (with admin role)                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  Global TimeoutInterceptor │  BEFORE
        │  (starts 5s timer)         │
        └────────┬───────────────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │  Global AuthGuard          │  ← Checks token
        │  ✓ Token valid             │
        └────────┬───────────────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │  Method RolesGuard         │  ← Checks role
        │  ✓ User is admin           │
        └────────┬───────────────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │  Global LoggingInterceptor │  BEFORE
        │  (logs request)            │
        └────────┬───────────────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │  Global TransformIntercept │  BEFORE
        └────────┬───────────────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │  Controller CacheIntercept │  BEFORE
        │  (POST = no cache)         │
        └────────┬───────────────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │  Validation Pipe           │
        │  (validates DTO)           │
        └────────┬───────────────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │  UsersController.create()  │  ← Route Handler
        │  returns new user          │
        └────────┬───────────────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │  Controller CacheIntercept │  AFTER
        └────────┬───────────────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │  Global TransformIntercept │  AFTER
        │  (wraps in standard format)│
        └────────┬───────────────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │  Global LoggingInterceptor │  AFTER
        │  (logs response + time)    │
        └────────┬───────────────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │  Global TimeoutInterceptor │  AFTER
        │  (clears timer)            │
        └────────┬───────────────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │  Response to Client        │
        └────────────────────────────┘
```

---

## Best Practices

### Guards

1. **Keep guards focused**: One guard = one concern (auth, roles, throttling)
2. **Use dependency injection**: Register via `APP_GUARD` in module for DI support
3. **Throw appropriate exceptions**: Use `UnauthorizedException`, `ForbiddenException`, etc.
4. **Combine guards**: Use multiple guards together (auth → roles → throttle)
5. **Attach user to request**: Let guards enrich the request object

### Interceptors

1. **Use RxJS operators**: Leverage `map`, `tap`, `catchError`, `timeout` for powerful transformations
2. **Keep them pure**: Don't modify shared state unless caching
3. **Order matters**: Place interceptors in correct order (logging → transform → cache)
4. **Handle errors gracefully**: Always include error handling in `tap` or `catchError`
5. **Consider performance**: Caching and timeout interceptors can significantly improve UX

### General

1. **Global for common concerns**: Auth, logging, transforms
2. **Controller for feature-specific**: Feature-specific caching, special transforms
3. **Method for exceptions**: Use sparingly for truly unique routes
4. **Document complex logic**: Add comments explaining guard/interceptor purpose
5. **Test thoroughly**: Write unit tests for your guards and interceptors

---

## Summary

| Feature | Purpose | Key Method | Returns | Best For |
|---------|---------|------------|---------|----------|
| **Guard** | Authorization/Authentication | `canActivate()` | `boolean` | Blocking unauthorized requests |
| **Interceptor** | Transform/Extend behavior | `intercept()` | `Observable` | Modifying requests/responses, logging, caching |

Both Guards and Interceptors are essential tools in NestJS for building robust, maintainable applications with clean separation of concerns. They follow the DRY principle and keep your controller code focused on business logic.

