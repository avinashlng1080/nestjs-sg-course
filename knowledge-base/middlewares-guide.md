# NestJS Middlewares

## What is Middleware?

Middleware is a function or class that runs **before** the route handler. It has access to the `Request`, `Response`, and a `next()` function to pass control along.

## Class-Based Middleware

```ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`[${req.method}] ${req.url}`);
    next();
  }
}
```

## Functional Middleware

For simple cases without dependencies:

```ts
export function logger(req: Request, res: Response, next: NextFunction) {
  console.log(`[${req.method}] ${req.url}`);
  next();
}
```

## Applying Middleware

Register middleware in a module's `configure` method:

```ts
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

@Module({ controllers: [UserController], providers: [UserService] })
export class UserModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('users');           // string path
      // .forRoutes(UserController); // or entire controller
      // .forRoutes({ path: 'users', method: RequestMethod.GET }); // specific method
  }
}
```

## Applying Multiple Middlewares

```ts
consumer
  .apply(LoggerMiddleware, AuthMiddleware)
  .forRoutes('users');
```

Middlewares execute in the order they are listed.

## Excluding Routes

```ts
consumer
  .apply(AuthMiddleware)
  .exclude({ path: 'users', method: RequestMethod.GET })
  .forRoutes(UserController);
```

## Global Middleware

Apply middleware to every route in `main.ts`:

```ts
const app = await NestFactory.create(AppModule);
app.use(logger); // functional middleware only
```

## Common Use Cases

- Logging and request tracing
- Parsing or transforming the request body
- Authentication checks (e.g. validating a session/cookie)
- CORS or rate-limiting (often via global middleware)
