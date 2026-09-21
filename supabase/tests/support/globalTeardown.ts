export default async function globalTeardown(): Promise<void> {
  if (globalThis.__EMBEDDED_PG__) {
    await globalThis.__EMBEDDED_PG__.stop();
    globalThis.__EMBEDDED_PG__ = undefined;
  }
}
