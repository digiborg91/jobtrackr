import { type Locator, type Page, } from '@playwright/test';

export class RegisterPage {
    readonly page: Page;
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly signInButton: Locator;
    readonly createOne: Locator;

    constructor (page: Page) {
        this.page = page;
        this.emailInput = page.locator('input[name="email"]');
        this.passwordInput = page.locator('input[name="password"]');
        this.signInButton = page.locator('button[type="submit"]');
        this.signInButton = page.locator('button[type="submit"]');
        this.createOne = page.locator('text=Create one');
    }

    async login(email:string, password: string) {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.signInButton.click();
        //Assert home page 
    }
}