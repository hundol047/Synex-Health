package com.synex.health;

import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;

/** Uses an installed offline Korean voice; no audio uploads or voice downloads. */
@CapacitorPlugin(name = "WorkoutSpeech")
public class WorkoutSpeechPlugin extends Plugin {
    private TextToSpeech engine;
    private PluginCall pending;
    private boolean ready;
    private int generation;

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        if (text.isEmpty() || text.length() > 500) { call.reject("음성 안내 문장을 확인해 주세요."); return; }
        getActivity().runOnUiThread(() -> {
            if (ready) { say(call); return; }
            if (pending != null) pending.resolve();
            pending = call;
            if (engine != null) return;
            final int version = ++generation;
            engine = new TextToSpeech(getContext(), status -> getActivity().runOnUiThread(() -> {
                if (engine == null || version != generation) return;
                Voice korean = null;
                if (status == TextToSpeech.SUCCESS && engine.getVoices() != null) {
                    for (Voice voice : engine.getVoices()) {
                        if (voice.getLocale().getLanguage().equals(Locale.KOREAN.getLanguage()) && !voice.isNetworkConnectionRequired()
                                && (voice.getFeatures() == null || !voice.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED))) {
                            korean = voice; break;
                        }
                    }
                }
                PluginCall current = pending; pending = null;
                if (korean == null || engine.setVoice(korean) == TextToSpeech.ERROR) {
                    engine.shutdown(); engine = null;
                    if (current != null) current.reject("기기에 한국어 오프라인 음성이 설치되어 있지 않습니다.");
                    return;
                }
                engine.setSpeechRate(1.15f); ready = true;
                if (current != null) say(current);
            }));
        });
    }

    private void say(PluginCall call) {
        int result = engine.speak(call.getString("text", ""), TextToSpeech.QUEUE_FLUSH, null, "synex-workout");
        if (result == TextToSpeech.ERROR) call.reject("운동 음성을 재생할 수 없습니다.");
        else call.resolve();
    }

    private void stopNow() {
        if (pending != null) { pending.resolve(); pending = null; }
        if (engine != null) engine.stop();
    }

    @PluginMethod
    public void stop(PluginCall call) { getActivity().runOnUiThread(() -> { stopNow(); call.resolve(); }); }

    @Override
    protected void handleOnPause() { stopNow(); }

    @Override
    protected void handleOnDestroy() {
        generation++; stopNow(); if (engine != null) engine.shutdown(); engine = null; ready = false;
    }
}
