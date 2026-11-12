// Row 12 (docs/admin.md §4) — the shop screen's two secrets, made on Dan's machine:
//   node scripts/admin-pass.mjs
// asks for the passphrase twice with the typing hidden (Dan and Georgiana choose it: four words), then prints
//   ADMIN_PASS_HASH  the passphrase's scrypt hash (the function checks a login against it)
//   ADMIN_SECRET     32 random bytes (the cookie's and the links' signatures)
// to paste into Vercel → slagerij-john → Settings → Environment Variables (Production), each as its own variable.
// The passphrase itself is never printed, written to a file or sent anywhere; the two printed values only go into
// Vercel (D-26: never into the repo, a file of this folder or a chat). A new ADMIN_SECRET signs out every phone and
// makes the links in mails already sent invalid.
import { createInterface } from 'node:readline';
import { hashPass, checkPass, newSecret } from '../src/lib/order-sign.js';

function ask(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: !!process.stdin.isTTY });
    if (process.stdin.isTTY) {
      // hide what is typed: the prompt is written once, every key after it prints nothing
      rl._writeToOutput = (s) => {
        if (s.includes(question)) process.stdout.write(question);
      };
    } else process.stdout.write(question);
    rl.question(question, (answer) => {
      rl.close();
      if (process.stdin.isTTY) process.stdout.write('\n');
      resolve(answer);
    });
  });
}

const first = await ask('Passphrase (hidden): ');
const words = first.trim().split(/\s+/).filter(Boolean);
if (first.trim().length < 16 || words.length < 3) {
  console.error('Too short: use at least three words and 16 characters (four words is the plan).');
  process.exit(1);
}
const again = await ask('Same passphrase again: ');
if (again !== first) {
  console.error('The two do not match. Nothing was made.');
  process.exit(1);
}
const hash = await hashPass(first);
if (!(await checkPass(hash, first))) {
  console.error('Self-check failed. Nothing was made.');
  process.exit(1);
}
console.log('\nPaste each into Vercel → slagerij-john → Settings → Environment Variables (Production):\n');
console.log(`ADMIN_PASS_HASH=${hash}`);
console.log(`ADMIN_SECRET=${newSecret()}`);
console.log('\nThen close this window. The passphrase is not stored anywhere.');
