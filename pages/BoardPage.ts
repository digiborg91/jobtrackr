import { type Locator, type Page, } from '@playwright/test';

export class BoardPage {

    readonly page: Page;
    readonly newApplicationButton: Locator;
    readonly searchCompanyRoleInput: Locator;
    readonly filterByTagInput: Locator;
    readonly sortingDropdown: Locator;

    constructor (page: Page) {
        this.page = page;
        this.newApplicationButton = page.getByRole('button', { name: 'New application' });
        this.searchCompanyRoleInput = page.getByLabel('Search applications');
        this.filterByTagInput = page.getByLabel('Filter by tag');
        this.sortingDropdown = page.getByLabel('Sort applications');
    }

    async createNewApplication() {
        await this.newApplicationButton.click();
    }

    // Opens the dialog for an existing application. exact: true matters here —
    // without it this would also match the drag handle's "Move {role} at
    // {company}" button, since that accessible name contains the role text too.
    async openApplication(role: string) {
        await this.page.getByRole('button', { name: role, exact: true }).click();
    }

    async selectSort(label: 'Newest first' | 'Oldest first' | 'Company A–Z') {
        await this.sortingDropdown.click();
        await this.page.getByRole('option', { name: label }).click();
    }

    // Returns each card's data-application-id, in the order they're rendered
    // in that column — i.e. the actual visual order, which is what a sort
    // test needs to verify rather than reading and parsing displayed text.
    async applicationIdsInColumn(status: string): Promise<string[]> {
        const cards = this.page.getByTestId(`column-${status.toLowerCase()}`).getByTestId('application-card');
        return cards.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-application-id') ?? ''));
    }

    // Filters the column's full id order down to just the ids you pass in,
    // preserving their relative order. Use this for sort assertions instead
    // of comparing the raw column contents directly — other applications
    // (from other tests running in parallel against the same shared account,
    // or just pre-existing data) can otherwise be present in the same column
    // and break an exact-match comparison, even though the sort itself is
    // working correctly.
    async orderOfKnownApplications(status: string, knownIds: string[]): Promise<string[]> {
        const columnOrder = await this.applicationIdsInColumn(status);
        return columnOrder.filter((id) => knownIds.includes(id));
    }

    cardByRole(role: string): Locator {
        return this.page.getByTestId('application-card').filter({ hasText: role });
    }

    // Scoped to one column's container, so this only matches if the card is
    // actually sitting in that column right now — not just present anywhere
    // on the board. Uses hasText (rendered text), not an accessible-name
    // locator, so it can't collide with the drag handle's aria-label the way
    // getByRole/getByLabel would.
    cardInColumn(status: string, role: string): Locator {
        return this.page
            .getByTestId(`column-${status.toLowerCase()}`)
            .getByTestId('application-card')
            .filter({ hasText: role });
    }

    // Picks up the card via its drag handle and moves it exactly one column
    // in the given direction, then drops it. dnd-kit re-measures the drop
    // targets asynchronously after each key event, so the short waits between
    // key presses are load-bearing, not just being cautious.
    async moveCard(role: string, company: string, direction: 'ArrowRight' | 'ArrowLeft') {
        const grip = this.page.getByRole('button', { name: `Move ${role} at ${company}`, exact: true });
        await grip.focus();
        await this.page.keyboard.press('Space');
        await this.page.waitForTimeout(200);
        await this.page.keyboard.press(direction);
        await this.page.waitForTimeout(200);
        await this.page.keyboard.press('Space');
    }
}
