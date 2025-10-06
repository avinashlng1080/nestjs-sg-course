import { MessagesRepository } from './messages.repository';


export class MessagesService {
    messagesRepository: MessagesRepository;
    
    constructor(messagesRepository: MessagesRepository) {
        // Services is creating its own dependency.
        // DO NOT DO THIS IN REAL APPLICATIONS - use dependency injection instead.
        this.messagesRepository = messagesRepository;
    }

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