package com.synex.health;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(VideoRecordingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
