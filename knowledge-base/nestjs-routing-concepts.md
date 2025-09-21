# NestJS Routing Concepts

## Method Names vs Route Paths

### Key Concept: Method Names Are Arbitrary

In NestJS, **method names are completely arbitrary** and have no special meaning for routing. The actual route is determined by the decorators and their parameters, not the method name.

### Example Analysis

```typescript
import { Controller, Get } from "@nestjs/common";

@Controller()  // No path = root controller
export class AppController {
	@Get()      // No path = maps to "/" (root route)
	getRootRoute(): string {  // Method name is arbitrary!
		return "Hi there!";
	}
}
```

**What determines the route:**
- `@Controller()` with no path = root controller
- `@Get()` with no path = maps to "/" (root route)
- Method name `getRootRoute` = **completely arbitrary**

### Alternative Method Names

All of these would work exactly the same:

```typescript
@Get()
getRootRoute(): string { return "Hi there!"; }

@Get()
hello(): string { return "Hi there!"; }

@Get()
index(): string { return "Hi there!"; }

@Get()
home(): string { return "Hi there!"; }

@Get()
whateverYouWant(): string { return "Hi there!"; }
```

## Route Mapping Rules

### Controller Path + Method Path = Final Route

| Controller Decorator | Method Decorator | Final Route |
|---------------------|------------------|-------------|
| `@Controller()` | `@Get()` | `/` |
| `@Controller()` | `@Get('/users')` | `/users` |
| `@Controller('/api')` | `@Get()` | `/api` |
| `@Controller('/api')` | `@Get('/users')` | `/api/users` |
| `@Controller('/api/v1')` | `@Get('/users')` | `/api/v1/users` |

### HTTP Method Decorators

- `@Get()` - GET requests
- `@Post()` - POST requests
- `@Put()` - PUT requests
- `@Patch()` - PATCH requests
- `@Delete()` - DELETE requests
- `@Options()` - OPTIONS requests
- `@Head()` - HEAD requests

## Special Method Names in NestJS

### Lifecycle Hooks (Not Routing)

NestJS does have special method names, but they're for **lifecycle hooks**, not routing:

```typescript
export class AppController implements OnModuleInit, OnModuleDestroy {
  onModuleInit() {
    // Called when module is initialized
  }
  
  onModuleDestroy() {
    // Called when module is destroyed
  }
  
  onApplicationBootstrap() {
    // Called after application bootstrap
  }
  
  onApplicationShutdown() {
    // Called before application shutdown
  }
}
```

### Guard and Interceptor Methods

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Guard logic
    return true;
  }
}
```

## Best Practices

### 1. Use Descriptive Method Names

Even though method names don't affect routing, use descriptive names for code readability:

```typescript
// Good
@Get()
getHomePage(): string { return "Welcome!"; }

@Get('/users')
getAllUsers(): User[] { return this.users; }

// Avoid
@Get()
a(): string { return "Welcome!"; }

@Get('/users')
b(): User[] { return this.users; }
```

### 2. Follow REST Conventions

```typescript
@Controller('/api/users')
export class UsersController {
  @Get()           // GET /api/users
  findAll() { }

  @Get(':id')      // GET /api/users/:id
  findOne() { }

  @Post()          // POST /api/users
  create() { }

  @Put(':id')      // PUT /api/users/:id
  update() { }

  @Delete(':id')   // DELETE /api/users/:id
  remove() { }
}
```

### 3. Use Route Parameters

```typescript
@Get(':id')
findOne(@Param('id') id: string): User {
  return this.users.find(user => user.id === id);
}
```

## Common Misconceptions

❌ **Wrong:** Method name determines the route
```typescript
@Get()
getUsers(): User[] { } // This doesn't create /users route
```

✅ **Correct:** Decorator parameters determine the route
```typescript
@Get('/users')
getUsers(): User[] { } // This creates /users route
```

## Summary

- **Method names are arbitrary** in NestJS routing
- **Route paths are determined by decorators** (`@Controller()`, `@Get()`, etc.)
- **Use descriptive method names** for code readability
- **Follow REST conventions** for API design
- **Special method names exist** but only for lifecycle hooks, not routing

This understanding is crucial for building maintainable and predictable NestJS applications.
