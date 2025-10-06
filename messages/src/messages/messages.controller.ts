import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateMessageDto } from './dtos/create-message.dto';

@Controller('messages')
export class MessagesController {
  @Get()
  listMessages() {
    return 'API: listMessages GET';
  }

  @Post()
  createMessage(@Body() body: CreateMessageDto) {
    console.log("body received", body);
    return `API: createMessage POST ${body.content}`;
  }

  @Get('/:id')
  getMessage(@Param('id') id: string) {
    console.log("id received", id);
    return `API: getMessage GET ${id}`;
  }
}
