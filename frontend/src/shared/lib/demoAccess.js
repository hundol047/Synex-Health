// Tab-scoped only, cleared at logout. Never localStorage or a bundled environment secret.
const KEY='synex-demo-access';
let code='';
export function getDemoAccessCode(){try{return code||sessionStorage.getItem(KEY)||'';}catch{return code;}}
export function setDemoAccessCode(value){code=value;try{if(value)sessionStorage.setItem(KEY,value);else sessionStorage.removeItem(KEY);}catch{}}
