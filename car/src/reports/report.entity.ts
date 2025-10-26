import { Column, PrimaryGeneratedColumn } from 'typeorm';

export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  price: number;

  // @Column()
  // make: string;

  // @Column()
  // model: string;

  // @Column()
  // year: number;
}
