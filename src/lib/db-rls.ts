const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

type SqlExecutor = (text: string, params?: readonly unknown[]) => Promise<unknown>;

function assertSafeIdentifier(identifier: string) {
  if (!IDENTIFIER_PATTERN.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }
}

function getAppRolePolicyName(tableName: string) {
  assertSafeIdentifier(tableName);
  return `${tableName}_app_role_access`;
}

export function buildEnsureCurrentAppRoleRlsSql(tableName: string): string {
  const policyName = getAppRolePolicyName(tableName);

  return `
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = current_schema()
      AND tablename = '${tableName}'
      AND policyname = '${policyName}'
  ) THEN
    EXECUTE format(
      'ALTER POLICY %I ON %I TO %I',
      '${policyName}',
      '${tableName}',
      current_user
    );
  ELSE
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO %I USING (true) WITH CHECK (true)',
      '${policyName}',
      '${tableName}',
      current_user
    );
  END IF;
END
$$
`;
}

/**
 * Keep RLS enabled while allowing the current app database role to read and write backend-owned tables.
 */
export async function ensureCurrentAppRoleRls(query: SqlExecutor, tableName: string) {
  assertSafeIdentifier(tableName);
  await query(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`);
  await query(buildEnsureCurrentAppRoleRlsSql(tableName));
}
