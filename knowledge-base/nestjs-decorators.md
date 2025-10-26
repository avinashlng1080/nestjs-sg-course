# NestJS Decorators - Complete Guide

## Table of Contents
1. [What are Decorators?](#what-are-decorators)
2. [Class Decorators](#class-decorators)
3. [Method Decorators](#method-decorators)
4. [Parameter Decorators](#parameter-decorators)
5. [Property Decorators](#property-decorators)
6. [Decorator Composition](#decorator-composition)
7. [Custom Decorators](#custom-decorators)
8. [Best Practices](#best-practices)

---

## What are Decorators?

**Decorators** are a TypeScript feature that allows you to add metadata and modify the behavior of classes, methods, properties, and parameters. In NestJS, decorators are used extensively to define routes, inject dependencies, apply middleware, and more.

### Decorator Types

```
┌─────────────────────────────────────────────────┐
│              Decorator Types                     │
│                                                  │
│  1. Class Decorators                            │
│     @Controller(), @Injectable(), @Module()     │
│                                                  │
│  2. Method Decorators                           │
│     @Get(), @Post(), @UseGuards()               │
│                                                  │
│  3. Parameter Decorators                        │
│     @Body(), @Param(), @Query()                 │
│                                                  │
│  4. Property Decorators                         │
│     @Column(), @PrimaryGeneratedColumn()        │
└─────────────────────────────────────────────────┘
```

### Why Use Decorators?

✅ **Declarative** - Express intent clearly  
✅ **Reusable** - Apply same behavior across multiple places  
✅ **Maintainable** - Centralize cross-cutting concerns  
✅ **Type-safe** - Full TypeScript support  
✅ **Framework integration** - Core to NestJS architecture  

---

## Class Decorators

Class decorators are applied to class declarations and can modify or replace the class definition.

### @Controller()

**Purpose**: Marks a class as a controller that handles HTTP requests  
**Scope**: Class level  
**Use On**: Controllers only

```typescript
import { Controller } from '@nestjs/common';

@Controller('users')  // ← Route prefix
export class UsersController {
  // All routes in this controller start with /users
}
```

**Path Options:**
```typescript
@Controller()              // No prefix: routes at root level
@Controller('users')       // Prefix: /users/*
@Controller('api/v1/users') // Nested: /api/v1/users/*
```

**Example:**
```typescript
@Controller('products')
export class ProductsController {
  @Get()           // → GET /products
  findAll() {}

  @Get(':id')      // → GET /products/:id
  findOne() {}
}
```

**✅ Use When:**
- Creating route handlers
- Building REST APIs
- Handling HTTP requests

**❌ Don't Use On:**
- Services
- Repositories
- Utilities

---

### @Injectable()

**Purpose**: Marks a class as a provider that can be injected via DI  
**Scope**: Class level  
**Use On**: Services, Repositories, Guards, Interceptors, Pipes, Filters

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()  // ← Makes class injectable
export class UsersService {
  // This service can be injected into controllers, other services, etc.
}
```

**Common Use Cases:**

```typescript
// 1. Services
@Injectable()
export class UsersService {
  create(email: string) { }
}

// 2. Repositories
@Injectable()
export class UsersRepository {
  save(user: User) { }
}

// 3. Guards
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate() { return true; }
}

// 4. Interceptors
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept() { }
}

// 5. Pipes
@Injectable()
export class ValidationPipe implements PipeTransform {
  transform() { }
}

// 6. Filters
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  catch() { }
}
```

**Dependency Injection Example:**
```typescript
@Injectable()
export class OrdersService {
  constructor(
    private usersService: UsersService,      // ← Inject service
    private productsService: ProductsService, // ← Inject service
  ) {}
}
```

**✅ Use When:**
- Creating services with business logic
- Building repositories for data access
- Creating guards, interceptors, pipes, or filters
- Class needs to be injected elsewhere

**❌ Don't Use On:**
- Controllers (they're automatically injectable)
- Modules
- DTOs (Data Transfer Objects)
- Entities
- Interfaces

---

### @Module()

**Purpose**: Defines a module that organizes related components  
**Scope**: Class level  
**Use On**: Module classes only

```typescript
import { Module } from '@nestjs/common';

@Module({
  imports: [],       // Import other modules
  controllers: [],   // Register controllers
  providers: [],     // Register providers (services, etc.)
  exports: [],       // Export providers for other modules
})
export class UsersModule {}
```

**Complete Example:**
```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),  // Import entity
    AuthModule,                         // Import other module
  ],
  controllers: [UsersController],       // Register controller
  providers: [
    UsersService,                       // Register service
    UsersRepository,                    // Register repository
  ],
  exports: [UsersService],              // Export for other modules
})
export class UsersModule {}
```

**Module Properties:**

| Property | Purpose | Example |
|----------|---------|---------|
| `imports` | Modules to import | `[TypeOrmModule, AuthModule]` |
| `controllers` | Controllers to register | `[UsersController]` |
| `providers` | Providers to register | `[UsersService, UsersRepository]` |
| `exports` | Providers to share | `[UsersService]` |

**✅ Use When:**
- Organizing features into modules
- Grouping related components
- Creating feature modules
- Building shared modules

**❌ Don't Use On:**
- Controllers
- Services
- Any non-module class

---

### @Global()

**Purpose**: Makes a module's exports available globally  
**Scope**: Class level  
**Use On**: Modules that should be available everywhere

```typescript
import { Module, Global } from '@nestjs/common';

@Global()  // ← Module exports available everywhere
@Module({
  providers: [ConfigService, LoggerService],
  exports: [ConfigService, LoggerService],
})
export class CoreModule {}
```

**Use Case:**
```typescript
// CoreModule with @Global()
@Global()
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class CoreModule {}

// Other modules don't need to import CoreModule
@Module({
  providers: [UsersService],  // Can use ConfigService without importing
})
export class UsersModule {}
```

**✅ Use When:**
- Creating configuration modules
- Building logger modules
- Utility modules used everywhere

**❌ Don't Use:**
- For feature-specific modules
- Overuse (makes dependencies unclear)

---

### @Catch()

**Purpose**: Marks a class as an exception filter  
**Scope**: Class level  
**Use On**: Exception filter classes

```typescript
import { Catch, ExceptionFilter, HttpException } from '@nestjs/common';

@Catch(HttpException)  // ← Catch HTTP exceptions
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    // Handle exception
  }
}
```

**Catch Specific Exceptions:**
```typescript
@Catch(NotFoundException)           // Catch only NotFoundException
@Catch(BadRequestException, ConflictException)  // Catch multiple
@Catch()                            // Catch ALL exceptions
```

**✅ Use When:**
- Creating custom exception handlers
- Formatting error responses
- Logging errors

**❌ Don't Use On:**
- Regular classes
- Controllers
- Services

---

## Method Decorators

Method decorators are applied to method declarations and can modify method behavior.

### HTTP Method Decorators

**Purpose**: Define HTTP route handlers  
**Scope**: Method level  
**Use On**: Controller methods

```typescript
import { Get, Post, Put, Patch, Delete } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()           // GET /users
  findAll() {}

  @Get(':id')      // GET /users/:id
  findOne() {}

  @Post()          // POST /users
  create() {}

  @Put(':id')      // PUT /users/:id
  update() {}

  @Patch(':id')    // PATCH /users/:id
  partialUpdate() {}

  @Delete(':id')   // DELETE /users/:id
  remove() {}
}
```

**Route Patterns:**
```typescript
@Get()                  // No path: uses controller prefix
@Get('profile')         // Static path: /users/profile
@Get(':id')            // Dynamic param: /users/123
@Get(':id/posts')      // Combined: /users/123/posts
@Get('admin/*')        // Wildcard: /users/admin/anything
```

**Status Codes:**
```typescript
import { HttpCode, HttpStatus } from '@nestjs/common';

@Post()
@HttpCode(HttpStatus.CREATED)  // 201
create() {}

@Delete(':id')
@HttpCode(HttpStatus.NO_CONTENT)  // 204
remove() {}
```

**✅ Use When:**
- Creating REST API endpoints
- Handling HTTP requests
- Building CRUD operations

**❌ Don't Use On:**
- Service methods
- Utility functions
- Private helper methods

---

### @UseGuards()

**Purpose**: Apply guards to routes  
**Scope**: Method or class level  
**Use On**: Controller methods or classes

```typescript
import { UseGuards } from '@nestjs/common';

@Controller('users')
@UseGuards(AuthGuard)  // ← Apply to entire controller
export class UsersController {
  
  @Get('profile')
  @UseGuards(RolesGuard)  // ← Apply to specific method
  getProfile() {}
}
```

**Multiple Guards:**
```typescript
@Get('admin')
@UseGuards(AuthGuard, RolesGuard, ThrottleGuard)  // Execute left to right
getAdminData() {}
```

**✅ Use When:**
- Protecting routes with authentication
- Implementing authorization
- Rate limiting
- Any route-level access control

---

### @UseInterceptors()

**Purpose**: Apply interceptors to routes  
**Scope**: Method or class level  
**Use On**: Controller methods or classes

```typescript
import { UseInterceptors } from '@nestjs/common';

@Controller('users')
@UseInterceptors(LoggingInterceptor)  // ← Apply to all routes
export class UsersController {
  
  @Get()
  @UseInterceptors(CacheInterceptor)  // ← Apply to specific route
  findAll() {}
}
```

**Common Interceptors:**
```typescript
@UseInterceptors(LoggingInterceptor)      // Logging
@UseInterceptors(TransformInterceptor)    // Response transformation
@UseInterceptors(CacheInterceptor)        // Caching
@UseInterceptors(TimeoutInterceptor)      // Timeout handling
```

**File Upload:**
```typescript
import { FileInterceptor } from '@nestjs/platform-express';

@Post('upload')
@UseInterceptors(FileInterceptor('file'))
uploadFile(@UploadedFile() file: Express.Multer.File) {}
```

**✅ Use When:**
- Transforming responses
- Logging requests/responses
- Caching
- File uploads

---

### @UsePipes()

**Purpose**: Apply pipes to routes  
**Scope**: Method or class level  
**Use On**: Controller methods or classes

```typescript
import { UsePipes, ValidationPipe } from '@nestjs/common';

@Controller('users')
@UsePipes(ValidationPipe)  // ← Apply to all routes
export class UsersController {
  
  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))  // ← Specific config
  create(@Body() dto: CreateUserDto) {}
}
```

**✅ Use When:**
- Validating DTOs at route level
- Custom transformation logic per route

**Note**: Usually applied globally in `main.ts` instead

---

### @UseFilters()

**Purpose**: Apply exception filters to routes  
**Scope**: Method or class level  
**Use On**: Controller methods or classes

```typescript
import { UseFilters } from '@nestjs/common';

@Controller('users')
@UseFilters(HttpExceptionFilter)  // ← Apply to all routes
export class UsersController {
  
  @Get(':id')
  @UseFilters(NotFoundExceptionFilter)  // ← Apply to specific route
  findOne() {}
}
```

**✅ Use When:**
- Custom error handling per route
- Special error formatting for specific endpoints

---

### @Render()

**Purpose**: Render a template view  
**Scope**: Method level  
**Use On**: Controller methods (with template engine)

```typescript
import { Render } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  @Render('index')  // ← Render 'index' template
  root() {
    return { message: 'Hello world!' };
  }
}
```

**✅ Use When:**
- Building server-side rendered apps
- Using template engines (Pug, EJS, Handlebars)

---

## Parameter Decorators

Parameter decorators are applied to method parameters to extract data from requests.

### @Body()

**Purpose**: Extract request body  
**Scope**: Parameter level  
**Use On**: Controller method parameters

```typescript
import { Body } from '@nestjs/common';

@Post()
createUser(@Body() createUserDto: CreateUserDto) {
  // Full body
}

@Post()
createUser(@Body('email') email: string) {
  // Extract specific property
}
```

**With Validation:**
```typescript
@Post()
createUser(@Body(ValidationPipe) dto: CreateUserDto) {
  // Body validated against DTO
}
```

**✅ Use When:**
- POST, PUT, PATCH requests
- Receiving JSON data
- Form submissions

**❌ Don't Use On:**
- GET requests (no body)
- DELETE requests (usually no body)

---

### @Param()

**Purpose**: Extract route parameters  
**Scope**: Parameter level  
**Use On**: Controller method parameters

```typescript
import { Param } from '@nestjs/common';

@Get(':id')
findOne(@Param('id') id: string) {
  // Extract :id from URL
}

@Get(':userId/posts/:postId')
getPost(
  @Param('userId') userId: string,
  @Param('postId') postId: string,
) {}

@Get(':id')
findOne(@Param() params: any) {
  // Extract all params as object
  const id = params.id;
}
```

**With Transformation:**
```typescript
import { ParseIntPipe } from '@nestjs/common';

@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  // id is automatically converted to number
}
```

**✅ Use When:**
- Dynamic routes (/users/:id)
- Extracting path parameters
- RESTful resource identifiers

---

### @Query()

**Purpose**: Extract query parameters  
**Scope**: Parameter level  
**Use On**: Controller method parameters

```typescript
import { Query } from '@nestjs/common';

// GET /users?age=25&name=John
@Get()
findAll(
  @Query('age') age: string,
  @Query('name') name: string,
) {}

// Extract all query params
@Get()
findAll(@Query() query: any) {
  const { age, name, page } = query;
}
```

**With DTO:**
```typescript
class PaginationQueryDto {
  @IsInt()
  @Min(1)
  page: number;

  @IsInt()
  @Min(1)
  @Max(100)
  limit: number;
}

@Get()
findAll(@Query() query: PaginationQueryDto) {
  // query is validated and transformed
}
```

**✅ Use When:**
- Pagination (page, limit)
- Filtering (status, category)
- Sorting (sortBy, order)
- Search (q, search)

---

### @Headers()

**Purpose**: Extract request headers  
**Scope**: Parameter level  
**Use On**: Controller method parameters

```typescript
import { Headers } from '@nestjs/common';

@Get()
findAll(
  @Headers('authorization') auth: string,
  @Headers('user-agent') userAgent: string,
) {}

@Get()
findAll(@Headers() headers: Record<string, string>) {
  // All headers
}
```

**✅ Use When:**
- Reading auth tokens
- Getting user-agent
- Custom headers
- API keys

---

### @Req() / @Request()

**Purpose**: Access entire request object  
**Scope**: Parameter level  
**Use On**: Controller method parameters

```typescript
import { Req, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';

@Get()
findAll(@Req() request: ExpressRequest) {
  const { headers, body, params, query, user } = request;
}

// Alias
@Get()
findAll(@Request() request: ExpressRequest) {}
```

**✅ Use When:**
- Need access to full request object
- Custom request processing
- Accessing req.user (from auth)

**❌ Avoid:**
- When specific decorators exist (@Body, @Param, etc.)
- Makes code less testable

---

### @Res() / @Response()

**Purpose**: Access response object  
**Scope**: Parameter level  
**Use On**: Controller method parameters

```typescript
import { Res, Response } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';

@Get()
findAll(@Res() response: ExpressResponse) {
  response.status(200).json({ message: 'Success' });
  // Must manually send response!
}
```

**⚠️ Warning**: When using `@Res()`, you must manually send the response.

**Pass-through mode:**
```typescript
@Get()
findAll(@Res({ passthrough: true }) response: ExpressResponse) {
  response.cookie('token', 'value');
  return { message: 'Success' };  // Can still return value
}
```

**✅ Use When:**
- Setting cookies
- Custom headers
- Streaming responses
- File downloads

**❌ Avoid:**
- Regular JSON responses (use return instead)
- When NestJS automatic handling works

---

### @Session()

**Purpose**: Access session data  
**Scope**: Parameter level  
**Use On**: Controller method parameters

```typescript
import { Session } from '@nestjs/common';

@Get()
findAll(@Session() session: Record<string, any>) {
  session.visits = session.visits ? session.visits + 1 : 1;
}
```

**✅ Use When:**
- Using session-based authentication
- Storing user state
- Shopping cart functionality

---

### @UploadedFile() / @UploadedFiles()

**Purpose**: Access uploaded files  
**Scope**: Parameter level  
**Use On**: Controller method parameters

```typescript
import { UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

// Single file
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
uploadFile(@UploadedFile() file: Express.Multer.File) {
  return { filename: file.originalname };
}

// Multiple files
@Post('upload-multiple')
@UseInterceptors(FilesInterceptor('files'))
uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
  return { count: files.length };
}
```

**✅ Use When:**
- File uploads
- Image uploads
- Document uploads
- CSV imports

---

### @Ip()

**Purpose**: Get client IP address  
**Scope**: Parameter level  
**Use On**: Controller method parameters

```typescript
import { Ip } from '@nestjs/common';

@Get()
findAll(@Ip() ip: string) {
  console.log('Request from IP:', ip);
}
```

**✅ Use When:**
- Rate limiting by IP
- Logging
- Geo-location
- Security tracking

---

### @HostParam()

**Purpose**: Extract subdomain parameters  
**Scope**: Parameter level  
**Use On**: Controller method parameters

```typescript
import { Controller, Get, HostParam } from '@nestjs/common';

@Controller({ host: ':account.example.com' })
export class AccountController {
  @Get()
  getInfo(@HostParam('account') account: string) {
    return `Account: ${account}`;
  }
}

// Request: https://acme.example.com
// account = 'acme'
```

**✅ Use When:**
- Multi-tenant applications
- Subdomain routing
- SaaS platforms

---

## Property Decorators

Property decorators are applied to class properties, commonly used with TypeORM entities.

### TypeORM Entity Decorators

```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';

@Entity('users')  // ← Class decorator for table
export class User {
  @PrimaryGeneratedColumn()  // ← Auto-increment primary key
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()  // ← Auto-set on creation
  createdAt: Date;

  @UpdateDateColumn()  // ← Auto-update on save
  updatedAt: Date;

  @OneToMany(() => Post, post => post.author)
  posts: Post[];
}
```

### Common TypeORM Property Decorators

| Decorator | Purpose | Example |
|-----------|---------|---------|
| `@PrimaryGeneratedColumn()` | Auto-increment ID | `id: number` |
| `@Column()` | Regular column | `email: string` |
| `@CreateDateColumn()` | Auto-set on create | `createdAt: Date` |
| `@UpdateDateColumn()` | Auto-update on save | `updatedAt: Date` |
| `@OneToMany()` | One-to-many relation | `posts: Post[]` |
| `@ManyToOne()` | Many-to-one relation | `author: User` |
| `@OneToOne()` | One-to-one relation | `profile: Profile` |
| `@ManyToMany()` | Many-to-many relation | `tags: Tag[]` |

**✅ Use When:**
- Defining database entities
- Setting up relationships
- Configuring columns

**❌ Don't Use On:**
- DTOs
- Services
- Controllers

---

## Decorator Composition

### Combining Multiple Decorators

Decorators can be stacked and composed:

```typescript
@Controller('users')
@UseGuards(AuthGuard)
@UseInterceptors(LoggingInterceptor)
export class UsersController {
  
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @UsePipes(ValidationPipe)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') auth: string,
  ) {
    return this.usersService.findOne(id);
  }
}
```

### Execution Order

```
Class Decorators
    ↓
Method Decorators (top to bottom)
    ↓
Parameter Decorators (left to right)
```

**Example:**
```typescript
@Get(':id')                          // 1. Define route
@UseGuards(AuthGuard, RolesGuard)   // 2. Apply guards (left to right)
@UseInterceptors(LoggingInterceptor) // 3. Apply interceptor
findOne(
  @Param('id') id: string,           // 4. Extract id parameter
  @Query() query: any,               // 5. Extract query parameters
) {}
```

---

## Custom Decorators

### Creating Parameter Decorators

```typescript
// get-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// Usage
@Get('profile')
getProfile(@GetUser() user: User) {
  return user;
}
```

### Custom Decorator with Data

```typescript
// get-user.decorator.ts
export const GetUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    return data ? user?.[data] : user;
  },
);

// Usage
@Get('profile')
getProfile(
  @GetUser() user: User,           // Full user object
  @GetUser('email') email: string, // Just email
  @GetUser('id') id: number,       // Just id
) {}
```

### Metadata Decorators

```typescript
// roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// Usage
@Get('admin')
@Roles('admin', 'moderator')
getAdminData() {}
```

### Combining Decorators

```typescript
// auth.decorator.ts
import { applyDecorators, UseGuards } from '@nestjs/common';
import { Roles } from './roles.decorator';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';

export function Auth(...roles: string[]) {
  return applyDecorators(
    Roles(...roles),
    UseGuards(AuthGuard, RolesGuard),
  );
}

// Usage
@Get('admin')
@Auth('admin')  // ← Applies both guards and roles
getAdminData() {}
```

### Method Decorator

```typescript
// measure-time.decorator.ts
export function MeasureTime() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      const result = await originalMethod.apply(this, args);
      const end = Date.now();
      
      console.log(`${propertyKey} took ${end - start}ms`);
      return result;
    };

    return descriptor;
  };
}

// Usage
@MeasureTime()
async findAll() {
  // Method execution time will be logged
}
```

---

## Best Practices

### 1. Use Appropriate Decorators

```typescript
// ✅ GOOD - Right decorator for right purpose
@Controller('users')        // Controllers
export class UsersController {}

@Injectable()              // Services
export class UsersService {}

@Entity()                  // Database entities
export class User {}

// ❌ BAD - Wrong decorators
@Injectable()              // Don't use on controllers
export class UsersController {}

@Controller('users')       // Don't use on services
export class UsersService {}
```

### 2. Prefer Specific Parameter Decorators

```typescript
// ✅ GOOD - Use specific decorators
@Post()
create(
  @Body() createUserDto: CreateUserDto,
  @Headers('authorization') auth: string,
) {}

// ❌ BAD - Using @Req() when not needed
@Post()
create(@Req() request: Request) {
  const body = request.body;
  const auth = request.headers.authorization;
}
```

### 3. Apply Decorators at Appropriate Scope

```typescript
// ✅ GOOD - Global validation in main.ts
app.useGlobalPipes(new ValidationPipe());

// Then just use DTOs
@Post()
create(@Body() dto: CreateUserDto) {}

// ❌ BAD - Repeating on every method
@Post()
@UsePipes(ValidationPipe)
create(@Body() dto: CreateUserDto) {}
```

### 4. Order Decorators Logically

```typescript
// ✅ GOOD - Logical order
@Get(':id')                     // 1. Define route
@HttpCode(HttpStatus.OK)        // 2. Set status
@UseGuards(AuthGuard)           // 3. Authentication
@UseInterceptors(CacheInterceptor) // 4. Caching
findOne(@Param('id') id: string) {}

// ❌ BAD - Random order
@UseInterceptors(CacheInterceptor)
@UseGuards(AuthGuard)
@HttpCode(HttpStatus.OK)
@Get(':id')
findOne() {}
```

### 5. Don't Overuse Custom Decorators

```typescript
// ✅ GOOD - Simple, clear
@Get('profile')
getProfile(@GetUser() user: User) {}

// ❌ BAD - Over-abstracted
@CustomRoute('profile', 'GET', [AuthGuard, RolesGuard])
@WithLogging()
@WithCache()
@WithValidation()
getProfile(@ExtractUserFromRequest() user: User) {}
```

### 6. Use Type-Safe Decorators

```typescript
// ✅ GOOD - Type-safe parameter extraction
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  // id is guaranteed to be a number
}

// ❌ BAD - No type safety
@Get(':id')
findOne(@Param('id') id: string) {
  const numId = parseInt(id);  // Manual parsing
}
```

### 7. Group Related Decorators

```typescript
// ✅ GOOD - Related decorators together
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
@UseGuards(AuthGuard)
uploadFile(@UploadedFile() file: Express.Multer.File) {}

// ❌ BAD - Scattered decorators
@UseGuards(AuthGuard)
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
uploadFile() {}
```

---

## Decorator Reference Table

### Class Decorators

| Decorator | Use On | Purpose |
|-----------|--------|---------|
| `@Controller()` | Controllers | Define route handlers |
| `@Injectable()` | Services, Guards, etc. | Enable dependency injection |
| `@Module()` | Modules | Define module structure |
| `@Global()` | Modules | Make module globally available |
| `@Catch()` | Exception Filters | Catch exceptions |

### Method Decorators

| Decorator | Use On | Purpose |
|-----------|--------|---------|
| `@Get()`, `@Post()`, etc. | Controller methods | Define HTTP routes |
| `@UseGuards()` | Methods/Classes | Apply guards |
| `@UseInterceptors()` | Methods/Classes | Apply interceptors |
| `@UsePipes()` | Methods/Classes | Apply pipes |
| `@UseFilters()` | Methods/Classes | Apply filters |
| `@HttpCode()` | Methods | Set response status |
| `@Render()` | Methods | Render template |

### Parameter Decorators

| Decorator | Extracts | Example |
|-----------|----------|---------|
| `@Body()` | Request body | `@Body() dto: CreateUserDto` |
| `@Param()` | Route parameters | `@Param('id') id: string` |
| `@Query()` | Query parameters | `@Query('page') page: string` |
| `@Headers()` | Request headers | `@Headers('auth') auth: string` |
| `@Req()` | Full request | `@Req() request: Request` |
| `@Res()` | Full response | `@Res() response: Response` |
| `@Session()` | Session data | `@Session() session: any` |
| `@UploadedFile()` | Uploaded file | `@UploadedFile() file: File` |
| `@Ip()` | Client IP | `@Ip() ip: string` |

### Property Decorators (TypeORM)

| Decorator | Use On | Purpose |
|-----------|--------|---------|
| `@Entity()` | Classes | Define database table |
| `@PrimaryGeneratedColumn()` | Properties | Auto-increment ID |
| `@Column()` | Properties | Define column |
| `@CreateDateColumn()` | Properties | Auto-set on create |
| `@UpdateDateColumn()` | Properties | Auto-update on save |
| `@OneToMany()` | Properties | One-to-many relation |
| `@ManyToOne()` | Properties | Many-to-one relation |
| `@ManyToMany()` | Properties | Many-to-many relation |

---

## Complete Example: E-commerce Product Controller

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { GetUser } from './decorators/get-user.decorator';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { PaginationDto } from './dtos/pagination.dto';
import { User } from './entities/user.entity';

@Controller('products')
@UseGuards(AuthGuard)                    // Auth required for all routes
@UseInterceptors(LoggingInterceptor)     // Log all requests
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  // GET /products?page=1&limit=10
  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(
    @Query(ValidationPipe) paginationDto: PaginationDto,
    @GetUser() user: User,
  ) {
    return this.productsService.findAll(paginationDto);
  }

  // GET /products/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  // POST /products
  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'seller')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(ValidationPipe) createProductDto: CreateProductDto,
    @GetUser('id') userId: number,
  ) {
    return this.productsService.create(createProductDto, userId);
  }

  // PUT /products/:id
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'seller')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateProductDto: UpdateProductDto,
    @GetUser() user: User,
  ) {
    return this.productsService.update(id, updateProductDto, user);
  }

  // DELETE /products/:id
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    return this.productsService.remove(id, userId);
  }

  // POST /products/:id/image
  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image'))
  @UseGuards(RolesGuard)
  @Roles('admin', 'seller')
  uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productsService.uploadImage(id, file);
  }
}
```

---

## Summary

### Decorator Categories

1. **Class Decorators** - Define component types (Controller, Service, Module)
2. **Method Decorators** - Define routes and apply middleware
3. **Parameter Decorators** - Extract request data
4. **Property Decorators** - Define entity properties

### Key Principles

1. **Right decorator for right purpose** - Don't mix concerns
2. **Use specific decorators** - Prefer `@Body()` over `@Req()`
3. **Apply at appropriate scope** - Global, controller, or method
4. **Order matters** - Logical execution order
5. **Type safety** - Use pipes for transformation
6. **Custom decorators** - When built-in isn't enough

### Decorator Usage Rules

| Component | Required Decorator | Purpose |
|-----------|-------------------|---------|
| Controller | `@Controller()` | Handle HTTP requests |
| Service | `@Injectable()` | Business logic, DI |
| Guard | `@Injectable()` | Access control |
| Interceptor | `@Injectable()` | Transform requests/responses |
| Pipe | `@Injectable()` | Validate/transform data |
| Filter | `@Injectable()` + `@Catch()` | Handle exceptions |
| Entity | `@Entity()` | Database table |
| Module | `@Module()` | Organize components |

Decorators are the **foundation** of NestJS architecture. Master them to write clean, maintainable, and type-safe code!

