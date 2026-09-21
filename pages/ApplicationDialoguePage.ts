import { type Locator, type Page, } from '@playwright/test';
import type { ApplicationData } from '../fixtures/test-data';
    

const SOURCE_LABELS: Record<string, string> = {
        linkedin: 'LinkedIn',
        referral: 'Referral',
        company_website: 'Company website',
        job_board: 'Job board',
        recruiter: 'Recruiter',
        other: 'Other',
    };
export class ApplicationDialoguePage {

    readonly page: Page;
    readonly dialog: Locator;
    readonly companyInput: Locator;
    readonly roleInput: Locator;
    readonly statusDropdown: Locator;
    readonly locationInput: Locator;
    readonly sourceDropdown: Locator;
    readonly joblistingURLInput: Locator;
    readonly salaryMinInput: Locator;
    readonly salaryMaxInput: Locator;
    readonly followUpDateInput: Locator;
    readonly tagsInput: Locator;
    readonly addApplicationButton: Locator;
    readonly saveChangesButton: Locator;
    readonly deleteButton: Locator;



    constructor (page: Page) {
        this.page = page;
        // Scope every locator to the dialog itself — the board sits behind it in
        // the DOM, and its cards' accessible names (e.g. "Move X at <Company>")
        // can otherwise collide with page-wide getByLabel/getByRole matches.
        this.dialog = page.getByRole('dialog');
        this.companyInput = this.dialog.getByLabel('Company');
        this.roleInput = this.dialog.getByLabel('Role');
        // Status is a custom Radix dropdown, not a native <select> — this locator
        // is the clickable trigger button, not something selectOption() can drive.
        this.statusDropdown = this.dialog.getByLabel('Status');
        this.sourceDropdown = this.dialog.getByLabel('Source');
        this.locationInput = this.dialog.getByLabel('Location');
        this.joblistingURLInput = this.dialog.getByLabel('Job listing URL');
        this.salaryMinInput = this.dialog.getByLabel('Salary min');
        this.salaryMaxInput = this.dialog.getByLabel('Salary max');
        this.followUpDateInput = this.dialog.getByLabel('Follow up');
        this.tagsInput = this.dialog.getByLabel('Tags (comma separated)');
        this.addApplicationButton = this.dialog.getByRole('button', { name: 'Add application' });
        // Only present in create mode / edit mode respectively — the same
        // dialog component renders a different submit button label depending
        // on whether you opened it via "New application" or an existing card.
        this.saveChangesButton = this.dialog.getByRole('button', { name: 'Save changes' });
        this.deleteButton = this.dialog.getByRole('button', { name: 'Delete' });
    }

    async selectStatus(status: string) {
        await this.statusDropdown.click();
        // The dropdown's options render in a portal outside the dialog, so this
        // one deliberately searches the whole page, not this.dialog.
        await this.page.getByRole('option', { name: status }).click();
    }

    async selectSource(source: string) {
        await this.sourceDropdown.click();
        await this.page.getByRole('option', { name: SOURCE_LABELS[source] }).click();
    }

    async createNewApplication(data: ApplicationData, status: string) {
        await this.companyInput.fill(data.company);
        await this.roleInput.fill(data.role);
        await this.selectStatus(status);
        await this.selectSource(data.source);
        await this.locationInput.fill(data.location);
        await this.joblistingURLInput.fill(data.jobUrl);
        await this.salaryMinInput.fill(data.salaryMin);
        await this.salaryMaxInput.fill(data.salaryMax);
        await this.followUpDateInput.fill(data.followUpDate);
        await this.tagsInput.fill(data.tags);
        await this.addApplicationButton.click();
    }

    async save() {
        await this.saveChangesButton.click();
    }

    async delete() {
        await this.deleteButton.click();
    }
}