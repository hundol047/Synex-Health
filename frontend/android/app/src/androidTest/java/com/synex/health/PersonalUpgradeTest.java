package com.synex.health;

import android.content.Context;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.json.JSONObject;
import static org.junit.Assert.*;

/** Run the two methods in separate instrumentation invocations around adb install -r. */
@RunWith(AndroidJUnit4.class)
public class PersonalUpgradeTest extends PersonalStartupTest {
    private static final String SENTINEL = "업데이트보존검증";
    private void profile(ActivityScenario<MainActivity> scenario) throws Exception {
        waitFor(scenario, "!!document.querySelector('a[href=\"/health/profile\"]')");
        evaluate(scenario, "document.querySelector('a[href=\"/health/profile\"]').click()");
        waitFor(scenario, "!!document.querySelector('input[aria-label=\"이름\"]')");
    }
    @Test public void seedBeforeUpdate() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            profile(scenario);
            evaluate(scenario, "(()=>{const e=document.querySelector('input[aria-label=\"이름\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'"+SENTINEL+"');e.dispatchEvent(new Event('input',{bubbles:true}));})()");
            waitFor(scenario,"document.querySelector('input[aria-label=\"이름\"]').value==='"+SENTINEL+"'");
            evaluate(scenario,"Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='저장하기').click()");
            waitFor(scenario,"document.body.innerText.includes('저장되었습니다.')");
            String keys=new JSONObject(context.getSharedPreferences("WSSecureStorageSharedPreferences",Context.MODE_PRIVATE).getAll()).toString();
            assertNotEquals("{}",keys);
            assertTrue(context.getSharedPreferences("synex-upgrade-test",Context.MODE_PRIVATE).edit().putString("keys",keys).commit());
        }
    }
    @Test public void verifyAfterUpdate() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        String before=context.getSharedPreferences("synex-upgrade-test",Context.MODE_PRIVATE).getString("keys",null);
        assertNotNull("Pre-update test data missing; never clear app data between builds",before);
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            profile(scenario);
            waitFor(scenario,"document.querySelector('input[aria-label=\"이름\"]').value==='"+SENTINEL+"'");
            JSONObject oldKeys=new JSONObject(before);
            JSONObject currentKeys=new JSONObject(context.getSharedPreferences("WSSecureStorageSharedPreferences",Context.MODE_PRIVATE).getAll());
            assertEquals(oldKeys.length(),currentKeys.length());
            java.util.Iterator<String> it=oldKeys.keys();
            while(it.hasNext()){String key=it.next();assertEquals(oldKeys.get(key),currentKeys.get(key));}
            System.out.println("ANDROID_UPDATE_PRESERVED: encrypted profile decrypted after package replacement; native keys unchanged");
        }
    }
}
