export function uniqueEmail(prefix = "test"): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@example.com`;
}

export function newUserCredentials(prefix = "test") {
  return {
    name: "Test User",
    email: uniqueEmail(prefix),
    password: "password123",
  };
}
