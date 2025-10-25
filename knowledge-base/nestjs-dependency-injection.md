# NestJS Dependency Injection - Complete Guide

## Table of Contents
1. [What is Dependency Injection?](#what-is-dependency-injection)
2. [Why Use Dependency Injection?](#why-use-dependency-injection)
3. [How DI Works in NestJS](#how-di-works-in-nestjs)
4. [Single Module DI (Messages Example)](#single-module-di-messages-example)
5. [Cross-Module DI (Computer Example)](#cross-module-di-computer-example)
6. [Module Properties Explained](#module-properties-explained)
7. [Real-World Examples](#real-world-examples)
8. [Best Practices](#best-practices)

---

## What is Dependency Injection?

**Dependency Injection (DI)** is a design pattern where a class receives its dependencies from external sources rather than creating them itself.

### Without Dependency Injection ❌

```typescript
class MessagesController {
  constructor() {
    // Controller creates its own dependencies - BAD!
    this.messagesService = new MessagesService();
  }
  
  getMessages() {
    return this.messagesService.findAll();
  }
}

class MessagesService {
  constructor() {
    // Service creates its own dependencies - BAD!
    this.repository = new MessagesRepository();
  }
  
  findAll() {
    return this.repository.findAll();
  }
}
```

**Problems:**
- ❌ Tight coupling - hard to change implementations
- ❌ Difficult to test - can't mock dependencies
- ❌ Creates new instances every time
- ❌ Hard to manage shared state
- ❌ Violates Single Responsibility Principle

### With Dependency Injection ✅

```typescript
@Controller('messages')
class MessagesController {
  // Dependencies are injected - GOOD!
  constructor(private messagesService: MessagesService) {}
  
  getMessages() {
    return this.messagesService.findAll();
  }
}

@Injectable()
class MessagesService {
  // Dependencies are injected - GOOD!
  constructor(private repository: MessagesRepository) {}
  
  findAll() {
    return this.repository.findAll();
  }
}
```

**Benefits:**
- ✅ Loose coupling - easy to swap implementations
- ✅ Easy to test - can inject mocks
- ✅ Single instance (singleton by default)
- ✅ Automatic dependency resolution
- ✅ Clean, maintainable code

---

## Why Use Dependency Injection?

### 1. **Testability**

```typescript
// Without DI - hard to test
class UserService {
  constructor() {
    this.database = new DatabaseConnection(); // Real database!
  }
}

// With DI - easy to test
@Injectable()
class UserService {
  constructor(private database: DatabaseConnection) {}
}

// In tests:
const mockDatabase = { query: jest.fn() };
const service = new UserService(mockDatabase); // Inject mock!
```

### 2. **Flexibility**

```typescript
// Easy to swap implementations
class ProductionDatabase implements DatabaseConnection { }
class TestDatabase implements DatabaseConnection { }

// NestJS handles which one to inject based on environment
```

### 3. **Single Responsibility**

```typescript
// Each class focuses on its own job
// Creating dependencies is someone else's job (IoC Container)
@Injectable()
class OrderService {
  constructor(
    private paymentService: PaymentService,    // Don't create
    private emailService: EmailService,        // Don't create
    private inventoryService: InventoryService // Don't create
  ) {}
  
  // Just focus on order logic
  createOrder(order: Order) { }
}
```

### 4. **Reusability**

```typescript
// PowerService is created once and shared
@Injectable()
class PowerService { }

// Both CpuService and DiskService share the same instance
@Injectable()
class CpuService {
  constructor(private powerService: PowerService) {}
}

@Injectable()
class DiskService {
  constructor(private powerService: PowerService) {}
}
```

---

## How DI Works in NestJS

### The IoC Container

NestJS has an **Inversion of Control (IoC) Container** that manages all dependencies automatically.

```
┌─────────────────────────────────────────────────────────┐
│            NestJS IoC Container                          │
│  (Automatic Dependency Manager)                          │
│                                                           │
│  ┌─────────────────────────────────────────────┐        │
│  │  Dependency Registry                         │        │
│  │                                               │        │
│  │  • MessagesController    → registered        │        │
│  │  • MessagesService       → registered        │        │
│  │  • MessagesRepository    → registered        │        │
│  │  • PowerService          → registered        │        │
│  │  • CpuService            → registered        │        │
│  │  • DiskService           → registered        │        │
│  └─────────────────────────────────────────────┘        │
│                                                           │
│  Steps:                                                   │
│  1. Scan modules for providers                           │
│  2. Create instances (singletons by default)             │
│  3. Resolve dependencies (inject what's needed)          │
│  4. Wire everything together                             │
└─────────────────────────────────────────────────────────┘
```

### Key Decorators

| Decorator | Purpose | Used On |
|-----------|---------|---------|
| `@Injectable()` | Marks a class as available for injection | Services, Repositories |
| `@Controller()` | Marks a class as a controller (auto-injectable) | Controllers |
| `@Module()` | Defines a module with providers/controllers/imports | Module classes |

### The DI Flow

```
Application Starts
       ↓
┌──────────────────────┐
│   1. Module Scan     │  Scan all @Module() decorators
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ 2. Register Providers│  Register all @Injectable() classes
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ 3. Create Instances  │  Create singleton instances
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ 4. Inject Dependencies│ Inject dependencies into constructors
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ 5. Application Ready │  All wired up and ready!
└──────────────────────┘
```

---

## Single Module DI (Messages Example)

This example shows DI within a **single module** where all dependencies are in one place.

### Architecture

```
MessagesModule
┌────────────────────────────────────────────────────┐
│                                                     │
│  Controllers: [MessagesController]                 │
│  Providers:   [MessagesService, MessagesRepository]│
│                                                     │
│  ┌──────────────────────┐                         │
│  │ MessagesController   │                         │
│  │                      │                         │
│  │  depends on ↓        │                         │
│  └──────────────────────┘                         │
│           │                                         │
│           │ (injects)                               │
│           ▼                                         │
│  ┌──────────────────────┐                         │
│  │  MessagesService     │                         │
│  │                      │                         │
│  │  depends on ↓        │                         │
│  └──────────────────────┘                         │
│           │                                         │
│           │ (injects)                               │
│           ▼                                         │
│  ┌──────────────────────┐                         │
│  │ MessagesRepository   │                         │
│  │                      │                         │
│  │  (no dependencies)   │                         │
│  └──────────────────────┘                         │
│                                                     │
└────────────────────────────────────────────────────┘
```

### Code Implementation

**Step 1: Create Injectable Services**

```typescript
// messages.repository.ts
import { Injectable } from '@nestjs/common';
import { readFile, writeFile } from 'fs/promises';

@Injectable()  // ← Makes it available for injection
export class MessagesRepository {
  async findOne(id: string) {
    const contents = await readFile('messages.json', 'utf8');
    const messages = JSON.parse(contents);
    return messages[id];
  }

  async findAll() {
    const contents = await readFile('messages.json', 'utf8');
    const messages = JSON.parse(contents);
    return messages;
  }

  async create(content: string) {
    const contents = await readFile('messages.json', 'utf8');
    const messages = JSON.parse(contents);
    const id = Math.random().toString(36).substring(2, 15);
    messages[id] = { id, content };
    await writeFile('messages.json', JSON.stringify(messages, null, 2));
    return messages[id];
  }
}
```

```typescript
// messages.service.ts
import { Injectable } from '@nestjs/common';
import { MessagesRepository } from './messages.repository';

@Injectable()  // ← Makes it available for injection
export class MessagesService {
  // Inject MessagesRepository
  constructor(private messagesRepository: MessagesRepository) {}

  findOne(id: string) {
    return this.messagesRepository.findOne(id);
  }

  findAll() {
    return this.messagesRepository.findAll();
  }

  create(content: string) {
    return this.messagesRepository.create(content);
  }
}
```

**Step 2: Create Controller**

```typescript
// messages.controller.ts
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { MessagesService } from './messages.service';

@Controller('messages')  // ← Controllers are auto-injectable
export class MessagesController {
  // Inject MessagesService
  constructor(private messagesService: MessagesService) {}

  @Get()
  listMessages() {
    return this.messagesService.findAll();
  }

  @Post()
  createMessage(@Body() body: { content: string }) {
    return this.messagesService.create(body.content);
  }

  @Get('/:id')
  getMessage(@Param('id') id: string) {
    return this.messagesService.findOne(id);
  }
}
```

**Step 3: Register in Module**

```typescript
// messages.module.ts
import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { MessagesRepository } from './messages.repository';

@Module({
  controllers: [MessagesController],  // Register controller
  providers: [                        // Register providers (services)
    MessagesService,
    MessagesRepository
  ],
})
export class MessagesModule {}
```

### Dependency Resolution Flow

```
HTTP Request: GET /messages
         ↓
┌─────────────────────────────────────────────┐
│ 1. NestJS Routes to MessagesController      │
└────────┬────────────────────────────────────┘
         │
         │ Need MessagesService?
         │ ↓ Check IoC Container
         │
┌─────────────────────────────────────────────┐
│ 2. IoC Container checks:                    │
│    "Do I have MessagesService instance?"    │
│    ✓ Yes! (created at startup)              │
│    Inject it into controller                │
└────────┬────────────────────────────────────┘
         │
         │ MessagesService needs MessagesRepository?
         │ ↓ Check IoC Container
         │
┌─────────────────────────────────────────────┐
│ 3. IoC Container checks:                    │
│    "Do I have MessagesRepository instance?" │
│    ✓ Yes! (created at startup)              │
│    Already injected into MessagesService    │
└────────┬────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ 4. Controller.listMessages() executes       │
│    → calls this.messagesService.findAll()   │
│    → which calls this.repository.findAll()  │
└────────┬────────────────────────────────────┘
         │
         ▼
    Return Response
```

### Key Points

- **All in one module**: No need for `exports` or `imports`
- **Providers array**: List all services that should be injectable
- **Controllers array**: List all controllers
- **Automatic wiring**: NestJS resolves dependencies automatically

---

## Cross-Module DI (Computer Example)

This example shows DI **across multiple modules** where services need to be shared between modules.

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    ComputerModule                             │
│                                                               │
│  imports: [CpuModule, DiskModule]                            │
│  controllers: [ComputerController]                           │
│                                                               │
│       ┌────────────────────────┐                             │
│       │  ComputerController    │                             │
│       │                        │                             │
│       │  needs:                │                             │
│       │  - CpuService  ────────┼────► Import from CpuModule │
│       │  - DiskService ────────┼────► Import from DiskModule│
│       └────────────────────────┘                             │
└──────────────────────────────────────────────────────────────┘
                  │                       │
                  │                       │
        ┌─────────▼─────────┐   ┌───────▼──────────┐
        │   CpuModule       │   │   DiskModule     │
        │                   │   │                  │
        │ provides:         │   │ provides:        │
        │ - CpuService      │   │ - DiskService    │
        │                   │   │                  │
        │ exports:          │   │ exports:         │
        │ - CpuService ✓    │   │ - DiskService ✓  │
        │                   │   │                  │
        │ imports:          │   │ imports:         │
        │ - PowerModule     │   │ - PowerModule    │
        └─────────┬─────────┘   └────────┬─────────┘
                  │                       │
                  │                       │
                  └───────────┬───────────┘
                              │
                    ┌─────────▼──────────┐
                    │   PowerModule      │
                    │                    │
                    │ provides:          │
                    │ - PowerService     │
                    │                    │
                    │ exports:           │
                    │ - PowerService ✓   │
                    │                    │
                    │ (Shared by both    │
                    │  Cpu & Disk)       │
                    └────────────────────┘
```

### Detailed Dependency Graph

```
ComputerController
       │
       ├─── needs CpuService ──────┐
       │                            │
       └─── needs DiskService ──┐   │
                                 │   │
                    ┌────────────▼───▼─────────────┐
                    │                               │
                    │                               │
              CpuService                      DiskService
                    │                               │
                    │ needs                         │ needs
                    │ PowerService                  │ PowerService
                    │                               │
                    └───────────┬───────────────────┘
                                │
                                │ (Same instance!)
                                │
                          PowerService
                        (Singleton - shared)
```

### Code Implementation

**Step 1: Create Base Service (PowerService)**

```typescript
// power/power.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class PowerService {
  supplyPower(watts: number) {
    console.log(`Supplying ${watts} watts of power`);
    return `Supplying ${watts} watts of power`;
  }
}
```

```typescript
// power/power.module.ts
import { Module } from '@nestjs/common';
import { PowerService } from './power.service';

@Module({
  providers: [PowerService],  // Create PowerService
  exports: [PowerService]     // ← Make it available to other modules
})
export class PowerModule {}
```

**Step 2: Create Services That Depend on PowerService**

```typescript
// cpu/cpu.service.ts
import { Injectable } from '@nestjs/common';
import { PowerService } from '../power/power.service';

@Injectable()
export class CpuService {
  // Inject PowerService from PowerModule
  constructor(private powerService: PowerService) {}

  compute(a: number, b: number) {
    console.log('Drawing 10 watts of power from the power service');
    this.powerService.supplyPower(10);
    return a + b;
  }
}
```

```typescript
// cpu/cpu.module.ts
import { Module } from '@nestjs/common';
import { CpuService } from './cpu.service';
import { PowerModule } from '../power/power.module';

@Module({
  imports: [PowerModule],     // ← Import to get PowerService
  providers: [CpuService],    // Create CpuService
  exports: [CpuService]       // ← Make it available to other modules
})
export class CpuModule {}
```

```typescript
// disk/disk.service.ts
import { Injectable } from '@nestjs/common';
import { PowerService } from '../power/power.service';

@Injectable()
export class DiskService {
  // Inject PowerService from PowerModule
  constructor(private powerService: PowerService) {}

  getData() {
    console.log('Drawing 20 watts of power from the power service');
    this.powerService.supplyPower(20);
    return 'data';
  }
}
```

```typescript
// disk/disk.module.ts
import { Module } from '@nestjs/common';
import { DiskService } from './disk.service';
import { PowerModule } from '../power/power.module';

@Module({
  imports: [PowerModule],     // ← Import to get PowerService
  providers: [DiskService],   // Create DiskService
  exports: [DiskService]      // ← Make it available to other modules
})
export class DiskModule {}
```

**Step 3: Create Controller That Uses Multiple Services**

```typescript
// computer/computer.controller.ts
import { Controller, Get } from '@nestjs/common';
import { CpuService } from '../cpu/cpu.service';
import { DiskService } from '../disk/disk.service';

@Controller('computer')
export class ComputerController {
  constructor(
    private cpuService: CpuService,    // From CpuModule
    private diskService: DiskService,  // From DiskModule
  ) {}

  @Get()
  run() {
    return [
      this.cpuService.compute(1, 2),
      this.diskService.getData()
    ];
  }
}
```

```typescript
// computer/computer.module.ts
import { Module } from '@nestjs/common';
import { ComputerController } from './computer.controller';
import { CpuModule } from '../cpu/cpu.module';
import { DiskModule } from '../disk/disk.module';

@Module({
  imports: [CpuModule, DiskModule],  // ← Import modules to get their services
  controllers: [ComputerController]
})
export class ComputerModule {}
```

### Instance Sharing Diagram

```
Application Startup
        ↓
┌────────────────────────────────────────────────────┐
│ NestJS IoC Container creates instances:            │
│                                                     │
│  PowerService (id: 0x001)  ← Single instance       │
│  CpuService   (id: 0x002)                          │
│  DiskService  (id: 0x003)                          │
│  ComputerController (id: 0x004)                    │
└────────────────────────────────────────────────────┘
        ↓
┌────────────────────────────────────────────────────┐
│ Inject dependencies:                                │
│                                                     │
│  CpuService.powerService    = PowerService(0x001)  │
│  DiskService.powerService   = PowerService(0x001)  │
│                                      └──► Same!     │
│  ComputerController.cpuService  = CpuService(0x002)│
│  ComputerController.diskService = DiskService(0x003)│
└────────────────────────────────────────────────────┘
```

**Key Insight**: Both `CpuService` and `DiskService` receive the **exact same instance** of `PowerService` (singleton pattern).

### HTTP Request Flow

```
HTTP Request: GET /computer
         ↓
┌──────────────────────────────────────────────────┐
│ 1. Route to ComputerController                   │
└────────┬─────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────┐
│ 2. Controller needs CpuService & DiskService     │
│    IoC Container injects both                    │
└────────┬─────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────┐
│ 3. Controller calls:                             │
│    - cpuService.compute(1, 2)                    │
│      └─> CpuService uses PowerService (0x001)   │
│           └─> supplyPower(10)                    │
│                                                   │
│    - diskService.getData()                       │
│      └─> DiskService uses PowerService (0x001)  │
│           └─> supplyPower(20)                    │
│                                                   │
│    Same PowerService instance used by both! ✓    │
└────────┬─────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────┐
│ 4. Return response: [3, 'data']                  │
└──────────────────────────────────────────────────┘

Console Output:
Drawing 10 watts of power from the power service
Supplying 10 watts of power
Drawing 20 watts of power from the power service
Supplying 20 watts of power
```

---

## Module Properties Explained

### @Module Decorator Properties

```typescript
@Module({
  imports: [...],      // Modules to import
  controllers: [...],  // Controllers in this module
  providers: [...],    // Services to create
  exports: [...]       // Services to share with other modules
})
```

### 1. **providers**

**Purpose**: List all services, repositories, and other injectable classes that this module should create and manage.

```typescript
@Module({
  providers: [
    UserService,
    UserRepository,
    EmailService
  ]
})
export class UserModule {}
```

**What it does:**
- Creates instances of these classes
- Makes them available for injection **within this module**
- **Does NOT** make them available to other modules (need `exports` for that)

**Analogy**: Like declaring private variables in a class - only this module can use them (unless exported).

### 2. **exports**

**Purpose**: Make providers available to other modules that import this module.

```typescript
@Module({
  providers: [UserService, UserRepository],
  exports: [UserService]  // Only UserService is shared
})
export class UserModule {}
```

**What it does:**
- Allows other modules to use these providers
- You can only export what's in `providers`
- **Required** for cross-module dependency injection

**Analogy**: Like making class members `public` - other modules can access them.

```
UserModule
┌──────────────────────────────────┐
│ providers: [                     │
│   UserService,       ← Available inside module
│   UserRepository     ← Available inside module
│ ]                                │
│                                  │
│ exports: [                       │
│   UserService        ← Available to other modules ✓
│ ]                                │
│                                  │
│ UserRepository ← NOT exported,   │
│                  NOT available   │
│                  to other modules│
└──────────────────────────────────┘
```

### 3. **imports**

**Purpose**: Import other modules to use their exported providers.

```typescript
@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [UserService],
  controllers: [UserController]
})
export class UserModule {}
```

**What it does:**
- Brings in exported providers from other modules
- Makes those providers available for injection in this module
- Establishes module dependencies

**Analogy**: Like `import` statements in JavaScript - brings in external dependencies.

```
UserModule needs AuthService
         ↓
┌────────────────────────┐
│  UserModule            │
│                        │
│  imports: [AuthModule] │ ← Brings in AuthService
│                        │
│  providers: [          │
│    UserService ────────┼─→ Can inject AuthService ✓
│  ]                     │
└────────────────────────┘
         ↑
         │ provides AuthService
         │
┌────────────────────────┐
│  AuthModule            │
│                        │
│  providers: [          │
│    AuthService         │
│  ]                     │
│  exports: [            │
│    AuthService         │ ← Must be exported!
│  ]                     │
└────────────────────────┘
```

### 4. **controllers**

**Purpose**: Register HTTP controllers that handle routes.

```typescript
@Module({
  controllers: [UserController, ProfileController]
})
export class UserModule {}
```

**What it does:**
- Registers route handlers
- Controllers can inject providers from this module
- Controllers can inject providers from imported modules

### How They Work Together

```typescript
// Example: E-commerce application

// Product Module
@Module({
  providers: [ProductService, ProductRepository],
  exports: [ProductService],  // ← Share ProductService
  controllers: [ProductController]
})
export class ProductModule {}

// Cart Module
@Module({
  imports: [ProductModule],  // ← Get ProductService
  providers: [CartService],
  exports: [CartService],    // ← Share CartService
  controllers: [CartController]
})
export class CartModule {}

// Order Module
@Module({
  imports: [CartModule, ProductModule],  // ← Get both services
  providers: [OrderService],
  controllers: [OrderController]
})
export class OrderModule {}
```

**Dependency Flow:**

```
OrderModule
    │
    ├─ imports CartModule
    │       └─ provides CartService
    │       └─ exports CartService ✓
    │
    └─ imports ProductModule
            └─ provides ProductService
            └─ exports ProductService ✓

OrderService can inject:
  ✓ CartService (from CartModule)
  ✓ ProductService (from ProductModule)
```

### Common Pattern: Re-exporting

You can import a module and re-export its providers:

```typescript
@Module({
  imports: [DatabaseModule],
  exports: [DatabaseModule]  // ← Re-export entire module
})
export class SharedModule {}

// Now any module that imports SharedModule
// also gets DatabaseModule's exports
@Module({
  imports: [SharedModule]  // Gets DatabaseModule too!
})
export class UserModule {}
```

---

## Real-World Examples

### Example 1: User Management System

**Scenario**: Users, authentication, and profiles

```typescript
// auth/auth.service.ts
@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}
  
  async login(email: string, password: string) {
    // Login logic
    return this.jwtService.sign({ email });
  }
  
  async validateToken(token: string) {
    return this.jwtService.verify(token);
  }
}

// auth/auth.module.ts
@Module({
  imports: [JwtModule.register({ secret: 'secret' })],
  providers: [AuthService],
  exports: [AuthService]  // ← Share with other modules
})
export class AuthModule {}
```

```typescript
// users/users.service.ts
@Injectable()
export class UsersService {
  constructor(
    private usersRepository: UsersRepository,
    private authService: AuthService  // ← From AuthModule
  ) {}
  
  async createUser(email: string, password: string) {
    const user = await this.usersRepository.create(email, password);
    const token = await this.authService.login(email, password);
    return { user, token };
  }
}

// users/users.module.ts
@Module({
  imports: [AuthModule],  // ← Import to get AuthService
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
  controllers: [UsersController]
})
export class UsersModule {}
```

```typescript
// profile/profile.service.ts
@Injectable()
export class ProfileService {
  constructor(
    private usersService: UsersService,    // ← From UsersModule
    private authService: AuthService       // ← From AuthModule
  ) {}
  
  async getProfile(token: string) {
    const { email } = await this.authService.validateToken(token);
    return this.usersService.findByEmail(email);
  }
}

// profile/profile.module.ts
@Module({
  imports: [UsersModule, AuthModule],  // ← Import both
  providers: [ProfileService],
  controllers: [ProfileController]
})
export class ProfileModule {}
```

**Dependency Graph:**

```
ProfileModule
    │
    ├─── imports UsersModule
    │         └─── UsersService
    │              └─── needs AuthService
    │                   └─── from AuthModule
    │
    └─── imports AuthModule
              └─── AuthService (shared singleton)
```

### Example 2: E-commerce Order System

**Scenario**: Products, inventory, payments, and orders

```typescript
// inventory/inventory.service.ts
@Injectable()
export class InventoryService {
  async checkStock(productId: string, quantity: number): Promise<boolean> {
    // Check if product is in stock
    return true;
  }
  
  async reserveStock(productId: string, quantity: number): Promise<void> {
    // Reserve stock for order
  }
}

// inventory/inventory.module.ts
@Module({
  providers: [InventoryService],
  exports: [InventoryService]
})
export class InventoryModule {}
```

```typescript
// payment/payment.service.ts
@Injectable()
export class PaymentService {
  async processPayment(amount: number, cardToken: string): Promise<string> {
    // Process payment with Stripe/PayPal
    return 'payment_id_123';
  }
}

// payment/payment.module.ts
@Module({
  providers: [PaymentService],
  exports: [PaymentService]
})
export class PaymentModule {}
```

```typescript
// email/email.service.ts
@Injectable()
export class EmailService {
  async sendOrderConfirmation(email: string, orderId: string): Promise<void> {
    // Send email
  }
}

// email/email.module.ts
@Module({
  providers: [EmailService],
  exports: [EmailService]
})
export class EmailModule {}
```

```typescript
// orders/orders.service.ts
@Injectable()
export class OrdersService {
  constructor(
    private inventoryService: InventoryService,  // Check stock
    private paymentService: PaymentService,      // Process payment
    private emailService: EmailService,          // Send confirmation
    private ordersRepository: OrdersRepository   // Save order
  ) {}
  
  async createOrder(userId: string, items: OrderItem[], cardToken: string) {
    // 1. Check inventory
    for (const item of items) {
      const inStock = await this.inventoryService.checkStock(
        item.productId,
        item.quantity
      );
      if (!inStock) {
        throw new Error(`Product ${item.productId} out of stock`);
      }
    }
    
    // 2. Calculate total
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    // 3. Process payment
    const paymentId = await this.paymentService.processPayment(total, cardToken);
    
    // 4. Reserve stock
    for (const item of items) {
      await this.inventoryService.reserveStock(item.productId, item.quantity);
    }
    
    // 5. Save order
    const order = await this.ordersRepository.create({
      userId,
      items,
      total,
      paymentId
    });
    
    // 6. Send confirmation email
    await this.emailService.sendOrderConfirmation(userId, order.id);
    
    return order;
  }
}

// orders/orders.module.ts
@Module({
  imports: [
    InventoryModule,  // ← Get InventoryService
    PaymentModule,    // ← Get PaymentService
    EmailModule       // ← Get EmailService
  ],
  providers: [OrdersService, OrdersRepository],
  controllers: [OrdersController]
})
export class OrdersModule {}
```

**Dependency Graph:**

```
OrdersService
    │
    ├─── InventoryService (from InventoryModule)
    │
    ├─── PaymentService (from PaymentModule)
    │
    ├─── EmailService (from EmailModule)
    │
    └─── OrdersRepository (local provider)

All services are singletons - created once and shared!
```

### Example 3: Logging and Monitoring (Cross-Cutting Concern)

**Scenario**: Every service needs logging

```typescript
// logger/logger.service.ts
@Injectable()
export class LoggerService {
  log(context: string, message: string) {
    console.log(`[${context}] ${message}`);
  }
  
  error(context: string, error: Error) {
    console.error(`[${context}] ERROR:`, error.message);
  }
}

// logger/logger.module.ts
@Module({
  providers: [LoggerService],
  exports: [LoggerService]  // ← Share globally
})
export class LoggerModule {}
```

```typescript
// Multiple services can use it
@Injectable()
export class UserService {
  constructor(private logger: LoggerService) {}
  
  createUser(email: string) {
    this.logger.log('UserService', `Creating user: ${email}`);
    // Logic
  }
}

@Injectable()
export class OrderService {
  constructor(private logger: LoggerService) {}
  
  createOrder(userId: string) {
    this.logger.log('OrderService', `Creating order for user: ${userId}`);
    // Logic
  }
}

// Both modules import LoggerModule
@Module({
  imports: [LoggerModule],
  providers: [UserService]
})
export class UserModule {}

@Module({
  imports: [LoggerModule],
  providers: [OrderService]
})
export class OrderModule {}
```

**All services share the same LoggerService instance!**

---

## Best Practices

### 1. Use `private` for Dependencies

```typescript
// ✅ GOOD - private (recommended)
constructor(private userService: UserService) {}

// ❌ BAD - public (breaks encapsulation)
constructor(public userService: UserService) {}
```

### 2. Export Only What's Needed

```typescript
// ✅ GOOD - selective exports
@Module({
  providers: [UserService, UserRepository, UserValidator],
  exports: [UserService]  // Only expose UserService
})
export class UserModule {}

// ❌ BAD - exporting everything
@Module({
  providers: [UserService, UserRepository, UserValidator],
  exports: [UserService, UserRepository, UserValidator]  // Too much!
})
export class UserModule {}
```

### 3. Create Feature Modules

Organize by feature, not by type:

```
✅ GOOD Structure:
src/
├── users/
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── users.repository.ts
│   └── users.module.ts
├── orders/
│   ├── orders.controller.ts
│   ├── orders.service.ts
│   ├── orders.repository.ts
│   └── orders.module.ts
└── products/
    ├── products.controller.ts
    ├── products.service.ts
    └── products.module.ts

❌ BAD Structure:
src/
├── controllers/
│   ├── users.controller.ts
│   ├── orders.controller.ts
│   └── products.controller.ts
├── services/
│   ├── users.service.ts
│   ├── orders.service.ts
│   └── products.service.ts
```

### 4. Use Shared/Common Module for Cross-Cutting Concerns

```typescript
// shared/shared.module.ts
@Module({
  imports: [LoggerModule, DatabaseModule, CacheModule],
  exports: [LoggerModule, DatabaseModule, CacheModule]  // Re-export
})
export class SharedModule {}

// Now other modules just import SharedModule
@Module({
  imports: [SharedModule],  // Gets Logger, Database, Cache
  providers: [UserService]
})
export class UserModule {}
```

### 5. Use @Global() for Truly Global Services

```typescript
@Global()  // ← Makes providers available everywhere
@Module({
  providers: [ConfigService, LoggerService],
  exports: [ConfigService, LoggerService]
})
export class CoreModule {}

// Now you don't need to import CoreModule everywhere
// ConfigService and LoggerService are automatically available
```

**Use sparingly!** Only for truly universal services.

### 6. Avoid Circular Dependencies

```typescript
// ❌ BAD - Circular dependency
// user.service.ts
@Injectable()
export class UserService {
  constructor(private orderService: OrderService) {}  // Depends on Order
}

// order.service.ts
@Injectable()
export class OrderService {
  constructor(private userService: UserService) {}  // Depends on User
}
```

**Solution**: Use forwardRef or restructure:

```typescript
// ✅ GOOD - Use forwardRef
@Injectable()
export class UserService {
  constructor(
    @Inject(forwardRef(() => OrderService))
    private orderService: OrderService
  ) {}
}

// ✅ BETTER - Restructure to avoid circular dependency
// Create a shared service they both depend on
@Injectable()
export class UserOrderLinkService {
  // Shared logic here
}
```

### 7. Keep Services Focused (Single Responsibility)

```typescript
// ✅ GOOD - Each service has one job
@Injectable()
export class UserService {
  // Only user business logic
}

@Injectable()
export class UserRepository {
  // Only database operations
}

@Injectable()
export class UserValidator {
  // Only validation logic
}

// ❌ BAD - One service doing everything
@Injectable()
export class UserService {
  // Business logic + database + validation + email + ...
}
```

---

## Summary

### Dependency Injection in NestJS

| Concept | Description | Example |
|---------|-------------|---------|
| **@Injectable()** | Marks class as injectable | `@Injectable() class UserService {}` |
| **providers** | Register services in module | `providers: [UserService]` |
| **exports** | Share services with other modules | `exports: [UserService]` |
| **imports** | Use services from other modules | `imports: [AuthModule]` |
| **Singleton** | One instance per application (default) | All services are singletons |
| **IoC Container** | Automatic dependency manager | NestJS handles everything |

### Key Principles

1. **Don't create dependencies** - Let NestJS inject them
2. **Use `private` in constructors** - Better encapsulation
3. **Export selectively** - Only share what's needed
4. **Import to use** - Import modules to access their exports
5. **Organize by feature** - Group related files in modules
6. **Avoid circular dependencies** - Use forwardRef or restructure
7. **Keep services focused** - One responsibility per service

### Benefits Recap

✅ **Testability** - Easy to mock dependencies  
✅ **Maintainability** - Clean, organized code  
✅ **Reusability** - Share services across modules  
✅ **Flexibility** - Easy to swap implementations  
✅ **Automatic** - NestJS handles instance creation and injection  

Dependency Injection is the **foundation** of NestJS architecture. Master it, and you'll build scalable, maintainable applications with ease!

