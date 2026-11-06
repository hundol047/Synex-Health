package com.synex.health;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import android.os.Bundle;
import android.graphics.Color;
import android.view.ViewGroup;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends BridgeActivity {
    private boolean showingRecovery = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(VideoRecordingPlugin.class);
        registerPlugin(WorkoutSpeechPlugin.class);
        super.onCreate(savedInstanceState);
        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                showRendererRecovery(view);
                return true;
            }
        });
    }

    // Do not reload a terminated renderer or loop automatically. Keep the native
    // activity alive so the user can recreate a clean WebView without clearing data.
    void showRendererRecovery(WebView view) {
        if (showingRecovery) return;
        showingRecovery = true;
        if (view.getParent() instanceof ViewGroup) {
            ((ViewGroup) view.getParent()).removeView(view);
        }
        view.destroy();
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(android.view.Gravity.CENTER_VERTICAL);
        int padding = Math.round(28 * getResources().getDisplayMetrics().density);
        panel.setPadding(padding, padding, padding, padding);
        panel.setBackgroundColor(Color.rgb(244, 248, 248));
        TextView title = new TextView(this);
        title.setText("화면을 다시 열어 주세요");
        title.setTextSize(25);
        title.setTextColor(Color.rgb(22, 51, 64));
        panel.addView(title);
        TextView message = new TextView(this);
        message.setText("화면 표시가 중단되었습니다. 저장된 기록은 삭제하지 않습니다.\n\n반복되면 Android System WebView를 업데이트한 뒤 앱을 다시 열어 주세요.");
        message.setTextSize(15);
        message.setTextColor(Color.rgb(73, 101, 109));
        message.setPadding(0, padding, 0, padding);
        panel.addView(message);
        Button retry = new Button(this);
        retry.setText("화면 다시 열기");
        retry.setOnClickListener(v -> recreate());
        panel.addView(retry);
        Button close = new Button(this);
        close.setText("앱 닫기");
        close.setOnClickListener(v -> finish());
        panel.addView(close);
        setContentView(panel);
    }
}
