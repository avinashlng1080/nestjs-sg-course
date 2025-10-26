import { Body, Controller, Post } from '@nestjs/common';
import  { CreateUserDto } from './dtos/create-user.dto';

@Controller('auth')
export class UsersController {
  @Post('/signup')
  createUser(@Body() body: CreateUserDto) {
    console.log('1. creating user => ', JSON.stringify(body));
    console.log('2. creating user => ', body.email, body.password);
    return body;
  }

  @Post('/signout')
  logout() {
    return 'I am a logout route';
  }

  @Post('/signin')
  login() {
    return 'I am a login route';
  }
}
