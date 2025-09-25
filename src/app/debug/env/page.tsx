export const runtime = 'nodejs';
export default function DebugEnv() {
 return (
 <pre style={{ padding: 16 }}>
 {JSON.stringify({ DATABASE_URL: process.env.DATABASE_URL }, null, 2)}
 </pre>
 );
}
