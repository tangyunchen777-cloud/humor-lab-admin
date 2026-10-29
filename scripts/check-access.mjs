import assert from "node:assert/strict";
const base=process.argv[2]||"http://localhost:3010";
for(const path of ["/","/media","/media/new","/media/11111111-1111-4111-8111-111111111111/edit","/profiles","/ratings","/activity","/pipeline","/requests","/responses",...['terms','examples','models','providers','signup-domains','whitelist','images'].map(r=>`/manage/${r}`)]){
  const response=await fetch(new URL(path,base),{redirect:"manual"});
  assert.equal(response.status,307,`${path} must require login`);
  assert.equal(new URL(response.headers.get("location"),base).pathname,"/login");
  assert.match(response.headers.get("cache-control"),/no-store/);
  const body=await response.text();
  assert.ok(!body.includes("@gmail.com"),"Unauthenticated response exposed a profile");
  console.log(`PASS protected ${path}`);
}
const login=await fetch(new URL("/login",base));assert.equal(login.status,200);
assert.match(await login.text(),/Continue with Google/);console.log("PASS public Google login wall");
const callback=await fetch(new URL("/auth/callback",base),{redirect:"manual"});
assert.equal(callback.status,307);assert.equal(new URL(callback.headers.get("location"),base).pathname,"/login");
console.log("PASS callback without code fails safely");
