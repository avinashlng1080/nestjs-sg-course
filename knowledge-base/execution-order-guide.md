# Execution Order: Middleware, Interceptors, and DI

## Full Request Lifecycle

NestJS processes an incoming request in this order:

```
Incoming Request
  │
  ▼
1. Middleware
  │
  ▼
2. Guards
  │
  ▼
3. Interceptors (before handler)
  │
  ▼
4. Pipes
  │
  ▼
5. Route Handler
  │
  ▼
6. Interceptors (after handler)
  │
  ▼
7. Exception Filters (if an error was thrown at any point)
  │
  ▼
Response
```

## What Each Layer Does

| Layer | Purpose | Can reject request? |
|-------|---------|---------------------|
| **Middleware** | Raw request/response manipulation, logging, session handling | Yes (by not calling `next()`) |
| **Guards** | Authorization & authentication decisions | Yes (return `false` or throw) |
| **Interceptors** | Transform data before/after handler, add caching, logging, timing | Yes (can short-circuit) |
| **Pipes** | Validate and transform handler parameters | Yes (throw on validation failure) |
| **Exception Filters** | Catch and format errors into HTTP responses | N/A (handles errors) |

## Which Takes Precedence?

**Middleware always runs first.** It executes before NestJS even determines which route handler to call. It operates at the Express/Fastify level.

**Guards run second.** They decide whether the request is allowed to proceed (e.g. checking JWT tokens, roles). If a guard rejects the request, interceptors and pipes never execute.

**Interceptors wrap the handler.** They can modify both the incoming request context and the outgoing response. They use RxJS `Observable` streams and execute both before and after the route handler.

**Pipes run just before the handler.** They validate and transform individual route parameters (`@Body()`, `@Param()`, etc.).

**Exception Filters run last.** They catch any error thrown during the lifecycle and return a formatted error response.

## Where Does Dependency Injection Fit?

DI is **not** a lifecycle layer — it is the mechanism NestJS uses to create and wire instances. All class-based middleware, guards, interceptors, pipes, and filters participate in DI:

```ts
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private userService: UserService) {} // DI works here

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return !!request.session?.userId;
  }
}
```

DI does **not** change the execution order. It determines how instances are created and what dependencies are available. The lifecycle order above is always the same regardless of how components are injected.

## Scope of Application

Each layer can be applied at different scopes:

| Scope | Middleware | Guards | Interceptors | Pipes | Filters |
|-------|-----------|--------|--------------|-------|---------|
| Global | `app.use()` | `APP_GUARD` | `APP_INTERCEPTOR` | `APP_PIPE` | `APP_FILTER` |
| Controller | `forRoutes(Controller)` | `@UseGuards()` | `@UseInterceptors()` | `@UsePipes()` | `@UseFilters()` |
| Handler | `forRoutes({ path, method })` | `@UseGuards()` | `@UseInterceptors()` | `@UsePipes()` | `@UseFilters()` |
| Parameter | N/A | N/A | N/A | `@Body(Pipe)` | N/A |

When multiple instances of the same layer exist, **global** runs before **controller-scoped**, which runs before **handler-scoped**.
