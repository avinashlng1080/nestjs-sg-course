# NestJS Pipes - Complete Guide

## Table of Contents
1. [What are Pipes?](#what-are-pipes)
2. [When to Use Pipes](#when-to-use-pipes)
3. [Built-in Pipes](#built-in-pipes)
4. [Pipe Execution Order](#pipe-execution-order)
5. [ValidationPipe Deep Dive](#validationpipe-deep-dive)
6. [Custom Pipes](#custom-pipes)
7. [Real-World Examples](#real-world-examples)
8. [Best Practices](#best-practices)

---

## What are Pipes?

**Pipes** are classes decorated with `@Injectable()` that implement the `PipeTransform` interface. They have two primary use cases:

1. **Transformation** - Transform input data to the desired format
2. **Validation** - Validate input data and throw an exception if invalid

### Key Characteristics

- Pipes operate on the arguments being processed by a controller route handler
- Pipes run **after Guards** but **before the route handler method**
- Can either return the value (transformed or not) or throw an exception
- Exceptions thrown by pipes are handled by Exception Filters

### Request/Response Lifecycle with Pipes

```
Incoming Request
       ↓
┌──────────────────┐
│   Middleware     │
└────────┬─────────┘
         ↓
┌──────────────────┐
│     Guards       │
└────────┬─────────┘
         ↓
┌──────────────────┐
│  Interceptors    │  (BEFORE)
└────────┬─────────┘
         ↓
┌──────────────────┐
│   PIPES ←←←←←    │  ← Transform/Validate parameters
│                  │    Can throw exceptions
└────────┬─────────┘
         ↓
┌──────────────────┐
│  Route Handler   │  (Your controller method)
└────────┬─────────┘
         ↓
┌──────────────────┐
│  Interceptors    │  (AFTER)
└────────┬─────────┘
         ↓
    Response
```

---

## When to Use Pipes

### Use Pipes For:

✅ **Data validation** - Ensure incoming data meets requirements  
✅ **Data transformation** - Convert strings to numbers, parse dates  
✅ **Data sanitization** - Remove unwanted properties  
✅ **Type coercion** - Convert query parameters to proper types  
✅ **DTO validation** - Validate complex objects against schemas  

### Don't Use Pipes For:

❌ **Authentication/Authorization** - Use Guards instead  
❌ **Logging** - Use Interceptors or Middleware  
❌ **Error handling** - Use Exception Filters  
❌ **Business logic** - Keep in Services  

---

## Built-in Pipes

NestJS provides several built-in pipes out of the box.

### 1. ValidationPipe

**Purpose**: Validates objects against class-validator decorators

```typescript
import { ValidationPipe } from '@nestjs/common';

// Global usage
app.useGlobalPipes(new ValidationPipe());
```

**Use Case**: Validate DTOs with decorators

```typescript
// create-user.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

// controller
@Post()
createUser(@Body() createUserDto: CreateUserDto) {
  // ValidationPipe automatically validates before this runs
  return this.usersService.create(createUserDto);
}
```

### 2. ParseIntPipe

**Purpose**: Transforms string to integer, throws exception if invalid

```typescript
import { ParseIntPipe } from '@nestjs/common';

@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  // id is guaranteed to be a number
  return this.usersService.findOne(id);
}
```

**Request Flow:**
```
GET /users/123
  ↓
ParseIntPipe: "123" → 123 ✅
  ↓
Controller receives: id = 123 (number)

GET /users/abc
  ↓
ParseIntPipe: "abc" → ❌ BadRequestException
  ↓
Exception Filter handles error
```

### 3. ParseFloatPipe

**Purpose**: Transforms string to float

```typescript
import { ParseFloatPipe } from '@nestjs/common';

@Get('price/:amount')
getPrice(@Param('amount', ParseFloatPipe) amount: number) {
  // amount is a float
  return { price: amount * 1.1 };
}
```

**Example:**
```
GET /price/19.99
  ↓
amount = 19.99 (number)
```

### 4. ParseBoolPipe

**Purpose**: Transforms string to boolean

```typescript
import { ParseBoolPipe } from '@nestjs/common';

@Get('active/:status')
getActive(@Param('status', ParseBoolPipe) status: boolean) {
  return { isActive: status };
}
```

**Transformation:**
```
"true"  → true
"false" → false
"1"     → true
"0"     → false
Other   → BadRequestException
```

### 5. ParseArrayPipe

**Purpose**: Transforms comma-separated string to array

```typescript
import { ParseArrayPipe } from '@nestjs/common';

@Get('tags')
findByTags(
  @Query('tags', new ParseArrayPipe({ items: String, separator: ',' }))
  tags: string[]
) {
  return this.postsService.findByTags(tags);
}
```

**Example:**
```
GET /tags?tags=nestjs,typescript,nodejs
  ↓
tags = ['nestjs', 'typescript', 'nodejs']
```

### 6. ParseUUIDPipe

**Purpose**: Validates and ensures parameter is a valid UUID

```typescript
import { ParseUUIDPipe } from '@nestjs/common';

@Get(':id')
findOne(@Param('id', ParseUUIDPipe) id: string) {
  // id is guaranteed to be a valid UUID
  return this.usersService.findOne(id);
}
```

**Validation:**
```
Valid:   "550e8400-e29b-41d4-a716-446655440000" ✅
Invalid: "not-a-uuid" ❌ → BadRequestException
```

### 7. ParseEnumPipe

**Purpose**: Validates parameter is a valid enum value

```typescript
import { ParseEnumPipe } from '@nestjs/common';

enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}

@Get('role/:role')
getByRole(@Param('role', new ParseEnumPipe(UserRole)) role: UserRole) {
  return this.usersService.findByRole(role);
}
```

**Validation:**
```
GET /role/admin  → role = UserRole.ADMIN ✅
GET /role/user   → role = UserRole.USER ✅
GET /role/super  → BadRequestException ❌
```

### 8. DefaultValuePipe

**Purpose**: Provides default value if parameter is undefined

```typescript
import { DefaultValuePipe, ParseIntPipe } from '@nestjs/common';

@Get()
findAll(
  @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
) {
  return this.usersService.findAll(page, limit);
}
```

**Example:**
```
GET /users                    → page=1, limit=10
GET /users?page=2             → page=2, limit=10
GET /users?page=2&limit=20    → page=2, limit=20
```

### 9. ParseFilePipe

**Purpose**: Validates uploaded files (size, type, etc.)

```typescript
import { ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';

@Post('upload')
@UseInterceptors(FileInterceptor('file'))
uploadFile(
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5MB
        new FileTypeValidator({ fileType: 'image/*' }),
      ],
    })
  )
  file: Express.Multer.File
) {
  return { filename: file.filename };
}
```

---

## Pipe Execution Order

### Multiple Pipes on Same Parameter

Pipes execute **left to right**:

```typescript
@Get(':id')
findOne(
  @Param('id', DefaultValuePipe, ParseIntPipe) id: number
) {
  return this.usersService.findOne(id);
}
```

**Flow:**
```
Request: GET /users/123
  ↓
1. DefaultValuePipe: "123" → "123" (no change, value exists)
  ↓
2. ParseIntPipe: "123" → 123 (converted to number)
  ↓
Controller receives: id = 123
```

### Pipe Scope Levels

```
┌──────────────────────────────────────────────────┐
│          Global Scope (App-wide)                 │
│  app.useGlobalPipes(new ValidationPipe())        │
└──────────────┬───────────────────────────────────┘
               │ Applied to ALL routes
               ▼
┌──────────────────────────────────────────────────┐
│       Controller Scope (All routes)              │
│  @UsePipes(new ValidationPipe())                 │
└──────────────┬───────────────────────────────────┘
               │ Applied to controller routes
               ▼
┌──────────────────────────────────────────────────┐
│       Method Scope (Single route)                │
│  @UsePipes(new ValidationPipe())                 │
└──────────────┬───────────────────────────────────┘
               │ Applied to specific method
               ▼
┌──────────────────────────────────────────────────┐
│       Parameter Scope (Single parameter)         │
│  @Param('id', ParseIntPipe)                      │
└──────────────────────────────────────────────────┘
               │ Applied to specific param
               ▼
         Route Handler
```

---

## ValidationPipe Deep Dive

The **ValidationPipe** is the most commonly used pipe. It works with `class-validator` and `class-transformer` packages.

### Installation

```bash
npm install class-validator class-transformer
```

### Configuration Options

```typescript
// main.ts
app.useGlobalPipes(new ValidationPipe({
  // Remove properties not in DTO
  whitelist: true,
  
  // Throw error if non-whitelisted properties exist
  forbidNonWhitelisted: true,
  
  // Transform payloads to DTO instances
  transform: true,
  
  // Transform primitive types
  transformOptions: {
    enableImplicitConversion: true,
  },
  
  // Disable detailed errors in production
  disableErrorMessages: process.env.NODE_ENV === 'production',
  
  // Custom error message factory
  exceptionFactory: (errors) => {
    const messages = errors.map(error => ({
      field: error.property,
      errors: Object.values(error.constraints || {}),
    }));
    return new BadRequestException({
      message: 'Validation failed',
      errors: messages,
    });
  },
}));
```

### Option Explanations

| Option | Effect | Use When |
|--------|--------|----------|
| `whitelist: true` | Strips properties not in DTO | Always (security) |
| `forbidNonWhitelisted: true` | Throws error for extra properties | Strict validation |
| `transform: true` | Converts plain objects to DTO classes | Need class instances |
| `transformOptions` | Auto-convert types (`"123"` → `123`) | Query params, path params |
| `disableErrorMessages` | Hide validation details | Production (security) |
| `exceptionFactory` | Custom error format | Consistent API responses |

### ValidationPipe Flow Diagram

```
POST /users
Body: { email: "test@test.com", password: "12345" }
         ↓
┌─────────────────────────────────────────────────┐
│  ValidationPipe                                  │
│                                                  │
│  1. Transform plain object to DTO class         │
│     { email, password } → CreateUserDto         │
│                                                  │
│  2. Apply whitelist                             │
│     Remove properties not in DTO                │
│                                                  │
│  3. Validate against decorators                 │
│     @IsEmail() - ✓ Valid email                  │
│     @MinLength(8) - ✗ Only 5 characters         │
│                                                  │
│  4. Validation failed!                          │
└─────────┬───────────────────────────────────────┘
          │
          ▼
    Throw BadRequestException
          │
          ▼
    Exception Filter catches
          │
          ▼
    Return error response to client:
    {
      statusCode: 400,
      message: "Validation failed",
      errors: [
        {
          field: "password",
          errors: ["password must be longer than 8 characters"]
        }
      ]
    }
```

### Real-World DTO Example

```typescript
// create-user.dto.ts
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

export class CreateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(20)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password must contain uppercase, lowercase, and number/special char',
  })
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(120)
  age?: number;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
```

### Validation Groups

```typescript
// Different validation for create vs update
import { IsEmail, IsString, MinLength } from 'class-validator';

export class UserDto {
  @IsEmail({}, { groups: ['create', 'update'] })
  email: string;

  @IsString({ groups: ['create'] })
  @MinLength(8, { groups: ['create'] })
  password: string;  // Required only on create
}

// In controller
@Post()
create(@Body(new ValidationPipe({ groups: ['create'] })) dto: UserDto) {
  // Validates with 'create' rules
}

@Patch(':id')
update(@Body(new ValidationPipe({ groups: ['update'] })) dto: UserDto) {
  // Validates with 'update' rules (password optional)
}
```

---

## Custom Pipes

Create custom pipes when built-in pipes don't meet your needs.

### Simple Custom Pipe

```typescript
// uppercase.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class UppercasePipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!value) {
      throw new BadRequestException('Value is required');
    }
    
    return value.toUpperCase();
  }
}

// Usage
@Get(':name')
findOne(@Param('name', UppercasePipe) name: string) {
  return { name }; // name is uppercase
}
```

### Advanced Custom Pipe with Metadata

```typescript
// parse-objectid.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, Types.ObjectId> {
  transform(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException('Invalid ObjectId format');
    }
    
    return new Types.ObjectId(value);
  }
}

// Usage with MongoDB
@Get(':id')
findOne(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) {
  return this.usersService.findById(id);
}
```

### Custom Validation Pipe with Schema

```typescript
// joi-validation.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ObjectSchema } from 'joi';

@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(private schema: ObjectSchema) {}

  transform(value: any) {
    const { error, value: validatedValue } = this.schema.validate(value);
    
    if (error) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: error.details.map(detail => detail.message),
      });
    }
    
    return validatedValue;
  }
}

// Usage
import * as Joi from 'joi';

const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  age: Joi.number().min(18).max(120),
});

@Post()
create(
  @Body(new JoiValidationPipe(createUserSchema))
  createUserDto: CreateUserDto
) {
  return this.usersService.create(createUserDto);
}
```

### Custom Pipe with Dependency Injection

```typescript
// sanitize.pipe.ts
import { PipeTransform, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SanitizePipe implements PipeTransform {
  constructor(private configService: ConfigService) {}

  transform(value: any) {
    const allowedFields = this.configService.get<string[]>('ALLOWED_FIELDS');
    
    // Only keep allowed fields
    const sanitized = {};
    allowedFields.forEach(field => {
      if (value[field] !== undefined) {
        sanitized[field] = value[field];
      }
    });
    
    return sanitized;
  }
}
```

---

## Real-World Examples

### Example 1: E-commerce Product Creation

```typescript
// create-product.dto.ts
import {
  IsString,
  IsNumber,
  IsPositive,
  Min,
  Max,
  IsUrl,
  IsArray,
  ArrayMinSize,
  IsOptional,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description: string;

  @IsNumber()
  @IsPositive()
  @Min(0.01)
  @Max(1000000)
  price: number;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  categories: string[];

  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}

// products.controller.ts
import { Controller, Post, Body, ValidationPipe } from '@nestjs/common';

@Controller('products')
export class ProductsController {
  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    // DTO is validated and transformed
    return this.productsService.create(createProductDto);
  }
}
```

### Example 2: Pagination with Transform

```typescript
// pagination.dto.ts
import { IsInt, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)  // Transform string to number
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}

// users.controller.ts
@Get()
findAll(@Query() paginationDto: PaginationDto) {
  // Query params automatically transformed to numbers
  return this.usersService.findAll(paginationDto);
}
```

**Request Examples:**
```
GET /users                      → page=1, limit=10
GET /users?page=2&limit=20      → page=2, limit=20
GET /users?page=abc             → BadRequestException
GET /users?limit=200            → BadRequestException (max 100)
```

### Example 3: File Upload with Validation

```typescript
// upload.controller.ts
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('upload')
export class UploadController {
  @Post('avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  uploadAvatar(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 2 }), // 2MB
          new FileTypeValidator({ fileType: /image\/(jpeg|png|jpg)/ }),
        ],
      })
    )
    file: Express.Multer.File
  ) {
    return {
      message: 'Avatar uploaded successfully',
      filename: file.filename,
      size: file.size,
    };
  }
}
```

### Example 4: Date Range Query with Custom Pipe

```typescript
// parse-date-range.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseDateRangePipe implements PipeTransform {
  transform(value: string): { start: Date; end: Date } {
    const [start, end] = value.split(',');
    
    if (!start || !end) {
      throw new BadRequestException('Date range must be in format: start,end');
    }
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }
    
    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date');
    }
    
    return { start: startDate, end: endDate };
  }
}

// reports.controller.ts
@Get('sales')
getSalesReport(
  @Query('dateRange', ParseDateRangePipe) 
  dateRange: { start: Date; end: Date }
) {
  return this.reportsService.getSales(dateRange.start, dateRange.end);
}
```

**Usage:**
```
GET /sales?dateRange=2024-01-01,2024-01-31
  ↓
dateRange = {
  start: Date('2024-01-01'),
  end: Date('2024-01-31')
}
```

### Example 5: Nested Object Validation

```typescript
// address.dto.ts
import { IsString, IsPostalCode } from 'class-validator';

export class AddressDto {
  @IsString()
  street: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsPostalCode('US')
  zipCode: string;
}

// create-order.dto.ts
import { Type } from 'class-transformer';
import { ValidateNested, IsArray, ArrayMinSize } from 'class-validator';

export class CreateOrderDto {
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress: AddressDto;

  @ValidateNested()
  @Type(() => AddressDto)
  billingAddress: AddressDto;

  @IsArray()
  @ArrayMinSize(1)
  items: string[];
}

// orders.controller.ts
@Post()
create(@Body() createOrderDto: CreateOrderDto) {
  // Nested objects are validated
  return this.ordersService.create(createOrderDto);
}
```

---

## Best Practices

### 1. Use ValidationPipe Globally

```typescript
// ✅ GOOD - Apply once in main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));

// ❌ BAD - Repeating in every controller
@UsePipes(new ValidationPipe())
@Controller('users')
export class UsersController {}
```

### 2. Use Built-in Pipes When Possible

```typescript
// ✅ GOOD - Use built-in ParseIntPipe
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {}

// ❌ BAD - Custom implementation
@Get(':id')
findOne(@Param('id') id: string) {
  const numId = parseInt(id);
  if (isNaN(numId)) throw new BadRequestException();
}
```

### 3. Keep DTOs Close to Controllers

```
✅ GOOD Structure:
src/
├── users/
│   ├── dtos/
│   │   ├── create-user.dto.ts
│   │   └── update-user.dto.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
```

### 4. Use Descriptive Error Messages

```typescript
// ✅ GOOD - Helpful error messages
@IsEmail({}, { message: 'Please provide a valid email address' })
@MinLength(8, { message: 'Password must be at least 8 characters long' })

// ❌ BAD - Generic messages
@IsEmail()
@MinLength(8)
```

### 5. Separate Create and Update DTOs

```typescript
// ✅ GOOD - Separate DTOs
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  // No password in update DTO
}

// ❌ BAD - Same DTO with all fields optional
export class UserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @MinLength(8)
  password?: string;
}
```

### 6. Use Transform for Query Parameters

```typescript
// ✅ GOOD - Auto-transform types
app.useGlobalPipes(new ValidationPipe({
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
}));

export class QueryDto {
  @IsInt()
  page: number;  // Automatically converted from string
}

// ❌ BAD - Manual conversion
export class QueryDto {
  @IsString()
  page: string;  // Still a string, need manual conversion
}
```

### 7. Custom Error Factory for Consistent Responses

```typescript
// ✅ GOOD - Consistent error format
app.useGlobalPipes(new ValidationPipe({
  exceptionFactory: (errors) => {
    return new BadRequestException({
      success: false,
      statusCode: 400,
      message: 'Validation failed',
      errors: errors.map(error => ({
        field: error.property,
        constraints: error.constraints,
      })),
    });
  },
}));
```

### 8. Use whitelist and forbidNonWhitelisted

```typescript
// ✅ GOOD - Prevent mass assignment vulnerabilities
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,              // Strip extra properties
  forbidNonWhitelisted: true,   // Throw error on extra properties
}));
```

**Security Example:**
```
Request Body: {
  email: "user@test.com",
  password: "password123",
  isAdmin: true  // ← Malicious property
}

DTO:
class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
  // isAdmin is NOT in DTO
}

Result:
- whitelist: true → isAdmin is silently removed
- forbidNonWhitelisted: true → throws BadRequestException
```

---

## Summary

### Pipe Types and Use Cases

| Pipe | Purpose | Example |
|------|---------|---------|
| **ValidationPipe** | Validate DTOs with decorators | User registration, forms |
| **ParseIntPipe** | Convert string to integer | URL params, query params |
| **ParseFloatPipe** | Convert string to float | Prices, measurements |
| **ParseBoolPipe** | Convert string to boolean | Flags, toggles |
| **ParseArrayPipe** | Convert string to array | Tags, categories |
| **ParseUUIDPipe** | Validate UUID format | Database IDs |
| **ParseEnumPipe** | Validate enum values | Status, roles |
| **DefaultValuePipe** | Provide default values | Pagination defaults |
| **ParseFilePipe** | Validate file uploads | Images, documents |

### Key Principles

1. **Pipes transform and validate** - They don't handle business logic
2. **Use built-in pipes** when possible - Less code, better tested
3. **ValidationPipe is essential** - Use it globally for DTO validation
4. **Pipes throw exceptions** - Let Exception Filters handle them
5. **Apply at the right scope** - Global, controller, method, or parameter
6. **Keep security in mind** - Use whitelist and forbidNonWhitelisted
7. **Transform early** - Convert types at the pipe level, not in controllers

### Pipe Execution Flow

```
Request → Middleware → Guards → Interceptors (Before) 
  → PIPES (Transform/Validate) → Route Handler 
  → Interceptors (After) → Response
```

Pipes are a **critical part of NestJS** for ensuring data integrity, type safety, and security. Master them for building robust applications!

