import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const root=process.cwd();const out=process.env.SYNEX_GYM_OUTPUT||path.resolve(root,'../../work/apps_20261106');fs.mkdirSync(out,{recursive:true});
const configPath=path.join(root,'capacitor.config.json'),stringsPath=path.join(root,'android/app/src/main/res/values/strings.xml');const originalConfig=fs.readFileSync(configPath,'utf8'),originalStrings=fs.readFileSync(stringsPath,'utf8');
const base={...process.env,ANDROID_HOME:process.env.ANDROID_HOME||'/workspace/.android-sdk',ANDROID_SDK_ROOT:process.env.ANDROID_HOME||'/workspace/.android-sdk',ANDROID_USER_HOME:process.env.ANDROID_USER_HOME||'/workspace/.android-user',GRADLE_USER_HOME:process.env.GRADLE_USER_HOME||'/workspace/.cache/gradle',JAVA_HOME:process.env.JAVA_HOME||'/workspace/.toolchains/jdk-21.0.12.1+1',npm_config_cache:'/workspace/.cache/npm',VITE_LOCAL_ONLY:'true',VITE_RELEASE_BUILD:'false',VITE_API_BASE:'',SYNEX_VERSION_CODE:'2026110601',SYNEX_VERSION_NAME:'2.0.0-gym'};
function run(cmd,args,env,cwd=root){const r=spawnSync(cmd,args,{cwd,env,stdio:'inherit'});if(r.error||r.status!==0)throw Error(r.error?.message||`${cmd} failed (${r.status})`);}
try{
 for(const role of ['member','coach']){
  const name=role==='coach'?'Synex Coach':'Synex Member',id=`com.synex.health.${role}`;const env={...base,VITE_APP_AUDIENCE:role,SYNEX_APPLICATION_ID:id};
  const cfg=JSON.parse(originalConfig);cfg.appId=id;cfg.appName=name;fs.writeFileSync(configPath,JSON.stringify(cfg,null,2));
  fs.writeFileSync(stringsPath,`<?xml version="1.0" encoding="utf-8"?><resources><string name="app_name">${name}</string><string name="title_activity_main">${name}</string><string name="package_name">${id}</string><string name="custom_url_scheme">${id}</string></resources>`);
  run('npm',['run','build'],env);run('npx',['cap','sync','android'],env);run('./gradlew',['assembleDebug','--no-daemon','-Dhttps.proxyHost=proxy','-Dhttps.proxyPort=8080','-Dhttp.proxyHost=proxy','-Dhttp.proxyPort=8080','-Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts'],env,path.join(root,'android'));
  fs.copyFileSync(path.join(root,'android/app/build/outputs/apk/debug/app-debug.apk'),path.join(out,`Synex_${role==='coach'?'Coach':'Member'}_20261106.apk`));
  fs.cpSync(path.join(root,'dist'),path.join(out,`web-${role}`),{recursive:true});
 }
}finally{fs.writeFileSync(configPath,originalConfig);fs.writeFileSync(stringsPath,originalStrings);}
console.log('Built both gym apps in',out);
