package com.synex.health;

import android.content.Context;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.json.JSONTokener;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class PersonalStartupTest {
    private String evaluate(ActivityScenario<MainActivity> scenario, String script) throws Exception {
        AtomicReference<String> result = new AtomicReference<>();
        CountDownLatch latch = new CountDownLatch(1);
        scenario.onActivity(activity -> {
            WebView web = activity.getBridge().getWebView();
            web.evaluateJavascript(script, value -> { result.set(value); latch.countDown(); });
        });
        assertTrue("WebView did not answer JavaScript", latch.await(15, TimeUnit.SECONDS));
        Object value = new JSONTokener(result.get()).nextValue();
        return String.valueOf(value);
    }

    private void waitFor(ActivityScenario<MainActivity> scenario, String expression) throws Exception {
        long until = System.currentTimeMillis() + 45000;
        while (System.currentTimeMillis() < until) {
            if ("true".equals(evaluate(scenario, expression))) return;
            Thread.sleep(250);
        }
        fail("Android startup failed: " + evaluate(scenario, "document.body?.innerText||''"));
    }

    @Test public void completesOnboardingAndRestoresNativeEncryptedKey() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("com.synex.health.personal", context.getPackageName());
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            waitFor(scenario, "!!document.querySelector('button')");
            for (int i=0; i<6; i++) {
                waitFor(scenario, "Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='다음')");
                evaluate(scenario, "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='다음').click()");
                Thread.sleep(300);
            }
            waitFor(scenario, "Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='시작하기')");
            evaluate(scenario, "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='시작하기').click()");
            waitFor(scenario, "document.body.innerText.includes('내 기록은 이 기기에')");
            Map<String,?> stored = context.getSharedPreferences("WSSecureStorageSharedPreferences", Context.MODE_PRIVATE).getAll();
            assertFalse("No native encrypted key was stored", stored.isEmpty());
            assertTrue(stored.keySet().stream().anyMatch(k -> k.contains("synex.offline-key.")));
            for (Object value: stored.values()) assertFalse("Key bytes must not be plaintext", value.toString().contains("\"bytes\""));
            scenario.recreate();
            waitFor(scenario, "document.body.innerText.includes('내 기록은 이 기기에')");
            assertEquals("Restart must preserve the encrypted key", stored,
                context.getSharedPreferences("WSSecureStorageSharedPreferences", Context.MODE_PRIVATE).getAll());
            System.out.println("ANDROID_NATIVE_STARTUP_OK: onboarding, native encrypted key creation, restart without replacement");
        }
    }
}
