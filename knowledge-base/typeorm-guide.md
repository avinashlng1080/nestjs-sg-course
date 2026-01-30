# TypeORM and How to Use It

## What is TypeORM?

TypeORM is an ORM (Object-Relational Mapper) for TypeScript and JavaScript that lets you interact with databases using classes and decorators instead of raw SQL.

## Setup

Install the required packages:

```bash
npm install @nestjs/typeorm typeorm sqlite3
# or for postgres:
npm install @nestjs/typeorm typeorm pg
```

Import `TypeOrmModule` in your root module:

```ts
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'db.sqlite',
      entities: [],       // list entity classes here
      synchronize: true,  // auto-migrate in dev only
    }),
  ],
})
export class AppModule {}
```

## Defining Entities

An entity maps a class to a database table:

```ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ default: true })
  isActive: boolean;
}
```

## Registering Entities in a Feature Module

```ts
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserService],
  controllers: [UserController],
})
export class UserModule {}
```

## Using the Repository

Inject the repository into a service:

```ts
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private repo: Repository<User>,
  ) {}

  findAll() {
    return this.repo.find();
  }

  findOne(id: number) {
    return this.repo.findOneBy({ id });
  }

  create(data: Partial<User>) {
    const user = this.repo.create(data);
    return this.repo.save(user);
  }

  async update(id: number, data: Partial<User>) {
    const user = await this.findOne(id);
    Object.assign(user, data);
    return this.repo.save(user);
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    return this.repo.remove(user);
  }
}
```

## Key Repository Methods

| Method | Description |
|--------|-------------|
| `create(data)` | Creates an in-memory entity instance (does **not** persist) |
| `save(entity)` | Persists the entity to the database (insert or update) |
| `find()` | Returns all rows |
| `findOneBy({})` | Returns one row matching criteria |
| `remove(entity)` | Deletes the entity from the database |

## Relations

```ts
// One-to-Many / Many-to-One
@Entity()
export class User {
  @OneToMany(() => Report, (report) => report.user)
  reports: Report[];
}

@Entity()
export class Report {
  @ManyToOne(() => User, (user) => user.reports)
  user: User;
}
```

Load relations with `find({ relations: ['reports'] })` or use `QueryBuilder` for complex queries.
