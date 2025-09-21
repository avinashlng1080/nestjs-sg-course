import { Controller, Get } from "@nestjs/common";

@Controller("/app") // No path specified = root controller
export class AppController {
	@Get() // No path specified = root route "/"
	getRootRoute(): string {
		// Method name is arbitrary
		return "Hi there!";
	}

	@Get("bye")
	getByeThere(): string {
		return "Bye there!";
	}
}
