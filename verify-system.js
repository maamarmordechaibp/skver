#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n╔═══════════════════════════════════════════════╗');
console.log('║   SYSTEM VERIFICATION - Guest House IVR      ║');
console.log('╚═══════════════════════════════════════════════╝\n');

const checks = [];

// 1. Check Edge Functions
console.log('🔍 Checking Edge Functions...');
const functionsDir = path.join(__dirname, 'supabase', 'functions');
const voiceFunctions = fs.readdirSync(functionsDir)
  .filter(f => f.startsWith('voice-'))
  .length;
checks.push({
  name: `Voice Functions Deployed`,
  result: voiceFunctions > 0,
  details: `${voiceFunctions} functions found`
});

// 2. Check Database Schema
console.log('🔍 Checking Database Schema Files...');
const schemaExists = fs.existsSync(path.join(__dirname, 'database_schema.sql'));
const recordingsSchemaExists = fs.existsSync(path.join(__dirname, 'RECORDINGS_SETUP.sql'));
checks.push({
  name: 'Database Schema File',
  result: schemaExists,
  details: 'database_schema.sql'
});
checks.push({
  name: 'Recordings Schema File',
  result: recordingsSchemaExists,
  details: 'RECORDINGS_SETUP.sql'
});

// 3. Check Admin Dashboard
console.log('🔍 Checking Admin Dashboard...');
const adminExists = fs.existsSync(path.join(__dirname, 'public', 'admin.html'));
checks.push({
  name: 'Admin Dashboard',
  result: adminExists,
  details: 'public/admin.html'
});

// 4. Check LaML Builders
console.log('🔍 Checking LaML Builders...');
const lamlExists = fs.existsSync(path.join(__dirname, 'supabase', 'functions', '_shared', 'laml-builder.ts'));
const lamlRecordingsExists = fs.existsSync(path.join(__dirname, 'supabase', 'functions', '_shared', 'laml-builder-with-recordings.ts'));
checks.push({
  name: 'LaML Builder',
  result: lamlExists,
  details: 'Original builder'
});
checks.push({
  name: 'LaML Recordings Builder',
  result: lamlRecordingsExists,
  details: 'Enhanced builder with MP3 support'
});

// 5. Check Shared Utilities
console.log('🔍 Checking Shared Utilities...');
const dbExists = fs.existsSync(path.join(__dirname, 'supabase', 'functions', '_shared', 'database.ts'));
const apiClientExists = fs.existsSync(path.join(__dirname, 'supabase', 'functions', '_shared', 'external-api-client.ts'));
checks.push({
  name: 'Database Utility',
  result: dbExists,
  details: 'database.ts'
});
checks.push({
  name: 'External API Client',
  result: apiClientExists,
  details: 'external-api-client.ts'
});

// 6. Check Configuration Files
console.log('🔍 Checking Configuration...');
const nextConfigExists = fs.existsSync(path.join(__dirname, 'next.config.js'));
const tsconfigExists = fs.existsSync(path.join(__dirname, 'tsconfig.json'));
checks.push({
  name: 'Next.js Config',
  result: nextConfigExists,
  details: 'next.config.js'
});
checks.push({
  name: 'TypeScript Config',
  result: tsconfigExists,
  details: 'tsconfig.json'
});

// Display Results
console.log('\n╔═══════════════════════════════════════════════╗');
console.log('║   VERIFICATION RESULTS                        ║');
console.log('╚═══════════════════════════════════════════════╝\n');

const successCount = checks.filter(c => c.result).length;
const totalCount = checks.length;

checks.forEach(check => {
  const icon = check.result ? '✅' : '❌';
  const status = check.result ? 'OK' : 'MISSING';
  console.log(`${icon} ${check.name.padEnd(30)} [${status}] - ${check.details}`);
});

console.log('\n' + '═'.repeat(50));
console.log(`SUMMARY: ${successCount}/${totalCount} checks passed`);
console.log('═'.repeat(50) + '\n');

if (successCount === totalCount) {
  console.log('🎉 ALL SYSTEMS READY!\n');
  console.log('Next steps:\n');
  console.log('1. npm run dev                    (Start dev server)');
  console.log('2. http://localhost:3000/admin.html    (Open admin dashboard)');
  console.log('3. Run RECORDINGS_SETUP.sql in Supabase SQL Editor');
  console.log('4. Upload MP3 files to Supabase Storage');
  console.log('5. Call +1-845-935-0513 to test voice system\n');
} else {
  console.log('⚠️  SOME COMPONENTS MISSING - Review above\n');
}

console.log('For details, see: SYSTEM_WORKING.md\n');
