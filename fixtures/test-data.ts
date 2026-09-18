import { faker } from '@faker-js/faker';

export interface ApplicationData {
    company: string;
    role: string;
    jobUrl: string;
    salaryMin: string;
    salaryMax: string;
    followUpDate: string;
    tags: string;
}

export function uniqueApplication(): ApplicationData {
    // salaryMax is derived from salaryMin rather than picked independently,
    // so it always satisfies the "min <= max" validation the form enforces.
    const salaryMin = faker.number.int({ min: 40_000, max: 90_000 });
    const salaryMax = salaryMin + faker.number.int({ min: 5_000, max: 60_000 });

    return {
        company: faker.company.name(),
        role: faker.person.jobTitle(),
        jobUrl: faker.internet.url(),
        salaryMin: salaryMin.toString(),
        salaryMax: salaryMax.toString(),
        followUpDate: faker.date.future().toISOString().split('T')[0],
        tags: [faker.word.noun(), faker.word.noun()].join(','),
    };
}
