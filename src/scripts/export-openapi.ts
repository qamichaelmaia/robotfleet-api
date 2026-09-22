import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildApp } from '../app';

async function main() {
  const app = buildApp();
  await app.ready();

  const yaml = app.swagger({ yaml: true }) as unknown as string;
  const outPath = 'docs/openapi.yaml';
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, yaml);

  await app.close();
  console.log(`OpenAPI spec exported to ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
