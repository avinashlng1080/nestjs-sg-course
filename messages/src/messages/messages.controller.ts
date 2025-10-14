import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { CreateMessageDto } from './dtos/create-message.dto';
import { MessagesService } from './messages.service';

@Controller('messages')
export class MessagesController {
  messagesService: MessagesService;

  constructor(messagesService: MessagesService) {
    // don't do this in real applications - use dependency injection instead
    this.messagesService = messagesService;
  }

  @Get()
  listMessages() {
    return this.messagesService.findAll();
  }

  @Post()
  createMessage(@Body() body: CreateMessageDto) {
    console.log("body received", body);
    return this.messagesService.create(body.content);
  }

  @Get('/:id')
 async getMessage(@Param('id') id: string) {
    console.log("id received", id);
    const message = await this.messagesService.findOne(id);
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    console.log("message received", message);
    return message;
  }
}
